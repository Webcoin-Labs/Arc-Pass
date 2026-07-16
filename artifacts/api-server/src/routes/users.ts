import { Router, type IRouter, type Request, type Response } from "express";
import { db, walletsTable, walletChallengesTable } from "@workspace/db";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { getAddress, isAddress, verifyMessage, type Hex } from "viem";
import { createHash, randomBytes } from "crypto";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { configuration } from "../lib/env";

const router: IRouter = Router();
const MAX_WALLETS = 3;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function challengeMessage(input: { domain: string; address: string; nonce: string; issuedAt: Date; expiresAt: Date }): string {
  return [
    "Arc Pass wallet ownership verification",
    "",
    `Domain: ${input.domain}`,
    `Address: ${input.address}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expiration Time: ${input.expiresAt.toISOString()}`,
    "",
    "Signing proves ownership of this address. It does not submit a transaction or grant spending permission.",
  ].join("\n");
}

function publicWallet(wallet: typeof walletsTable.$inferSelect) {
  return {
    id: wallet.id,
    address: wallet.address,
    isPrimary: wallet.isPrimary,
    label: wallet.label,
    chain: wallet.chain,
    ownershipVerifiedAt: wallet.ownershipVerifiedAt,
    signatureMethod: wallet.signatureMethod,
    lastAnalysedAt: wallet.lastAnalysedAt,
    createdAt: wallet.createdAt,
  };
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    connections: {
      x: { connected: !!user.xUserId, username: user.xUsername },
      discord: { connected: !!user.discordUserId, username: user.discordUsername, avatarUrl: user.discordAvatarUrl },
      github: { connected: !!user.githubUserId, username: user.githubUsername },
    },
  });
});

async function listWallets(req: Request, res: Response): Promise<void> {
  const user = (req as AuthedRequest).user;
  const wallets = await db.select().from(walletsTable).where(and(eq(walletsTable.userId, user.id), isNotNull(walletsTable.ownershipVerifiedAt)));
  res.json(wallets.map(publicWallet));
}

router.get("/wallets", requireAuth, listWallets);
router.get("/users/me/wallets", requireAuth, listWallets);

router.post("/wallets/challenge", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const rawAddress = typeof req.body?.address === "string" ? req.body.address.trim() : "";
  if (!isAddress(rawAddress)) { res.status(400).json({ error: "Enter a valid EVM wallet address." }); return; }
  const address = getAddress(rawAddress);
  const existing = await db.select().from(walletsTable).where(eq(walletsTable.address, address.toLowerCase()));
  if (existing[0]) { res.status(409).json({ error: "This wallet is already associated with an Arc Pass identity." }); return; }
  const current = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (current.length >= MAX_WALLETS) { res.status(409).json({ error: "You can verify up to three wallets." }); return; }

  const nonce = randomBytes(24).toString("base64url");
  const domain = new URL(configuration.appUrl).host;
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const [challenge] = await db.insert(walletChallengesTable).values({
    userId: user.id,
    requestedAddress: address.toLowerCase(),
    nonceHash: hash(nonce),
    domain,
    expiresAt,
    createdAt: issuedAt,
  }).returning();

  res.status(201).json({
    challengeId: challenge.id,
    address,
    message: challengeMessage({ domain, address, nonce, issuedAt, expiresAt }),
    expiresAt: expiresAt.toISOString(),
  });
});

router.post("/wallets/verify", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const challengeId = Number(req.body?.challengeId);
  const signature = typeof req.body?.signature === "string" ? req.body.signature : "";
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (!Number.isSafeInteger(challengeId) || !signature || !message) { res.status(400).json({ error: "Challenge, message, and signature are required." }); return; }

  const [challenge] = await db.select().from(walletChallengesTable).where(and(eq(walletChallengesTable.id, challengeId), eq(walletChallengesTable.userId, user.id)));
  if (!challenge || challenge.consumedAt) { res.status(409).json({ error: "This wallet challenge has already been used or does not exist." }); return; }
  if (challenge.expiresAt <= new Date()) { res.status(410).json({ error: "This wallet challenge expired. Request a new one." }); return; }
  if (!message.includes(`Domain: ${challenge.domain}`) || !message.includes(`Address: ${getAddress(challenge.requestedAddress)}`)) {
    res.status(400).json({ error: "The signed message does not match this challenge." }); return;
  }
  const nonceMatch = message.match(/^Nonce: (.+)$/m);
  if (!nonceMatch || hash(nonceMatch[1]) !== challenge.nonceHash) { res.status(400).json({ error: "The signed message nonce is invalid." }); return; }

  const valid = await verifyMessage({ address: getAddress(challenge.requestedAddress), message, signature: signature as Hex }).catch(() => false);
  if (!valid) { res.status(400).json({ error: "Signature verification failed. Select the requested wallet and try again." }); return; }

  try {
    const wallet = await db.transaction(async (tx) => {
      const [consumed] = await tx.update(walletChallengesTable).set({ consumedAt: new Date() })
        .where(and(eq(walletChallengesTable.id, challenge.id), isNull(walletChallengesTable.consumedAt))).returning();
      if (!consumed) throw new Error("challenge_consumed");
      const current = await tx.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
      if (current.length >= MAX_WALLETS) throw new Error("wallet_limit");
      const isPrimary = req.body?.isPrimary === true || current.length === 0;
      if (isPrimary) await tx.update(walletsTable).set({ isPrimary: false }).where(eq(walletsTable.userId, user.id));
      const [created] = await tx.insert(walletsTable).values({
        userId: user.id,
        address: challenge.requestedAddress,
        isPrimary,
        label: typeof req.body?.label === "string" ? req.body.label.slice(0, 60) : null,
        chain: "evm",
        ownershipVerifiedAt: new Date(),
        signatureMethod: "eip191_personal_sign",
      }).returning();
      return created;
    });
    res.status(201).json(publicWallet(wallet));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    res.status(409).json({ error: reason === "wallet_limit" ? "You can verify up to three wallets." : "This challenge or wallet was already used." });
  }
});

router.post("/users/me/wallets", requireAuth, (_req, res) => {
  res.status(410).json({ error: "Wallet ownership must be verified with /wallets/challenge and /wallets/verify." });
});

async function removeWallet(req: Request, res: Response): Promise<void> {
  const user = (req as AuthedRequest).user;
  const walletId = Number(req.params.walletId);
  if (!Number.isSafeInteger(walletId)) { res.status(400).json({ error: "Invalid wallet ID." }); return; }
  const [wallet] = await db.select().from(walletsTable).where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, user.id)));
  if (!wallet) { res.status(404).json({ error: "Wallet not found." }); return; }
  await db.delete(walletsTable).where(eq(walletsTable.id, walletId));
  if (wallet.isPrimary) {
    const [next] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id)).limit(1);
    if (next) await db.update(walletsTable).set({ isPrimary: true }).where(eq(walletsTable.id, next.id));
  }
  res.sendStatus(204);
}

router.delete("/wallets/:walletId", requireAuth, removeWallet);
router.delete("/users/me/wallets/:walletId", requireAuth, removeWallet);

router.patch("/wallets/:walletId/primary", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const walletId = Number(req.params.walletId);
  const [wallet] = await db.select().from(walletsTable).where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, user.id)));
  if (!wallet) { res.status(404).json({ error: "Wallet not found." }); return; }
  await db.transaction(async (tx) => {
    await tx.update(walletsTable).set({ isPrimary: false }).where(eq(walletsTable.userId, user.id));
    await tx.update(walletsTable).set({ isPrimary: true }).where(eq(walletsTable.id, wallet.id));
  });
  res.json(publicWallet({ ...wallet, isPrimary: true }));
});

export default router;
