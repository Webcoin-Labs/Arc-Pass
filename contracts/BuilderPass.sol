// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Arc Pass — Builder Pass
/// @notice Non-transferable identity credential for verified Arc builders,
/// with no permanent onchain supply cap. One pass per verified identity.
/// Tier is stored on-chain and can move upward only, via an authorized
/// signature — upgrades update the existing token in place and never
/// consume additional supply. Release-phase claim limits are enforced by the
/// Arc Pass backend before it signs a mint authorization.
contract BuilderPass {
    struct Pass {
        address owner;
        bytes32 identityHash;
        uint8 tier;
        uint64 issuedAt;
        bool suspended;
        bool revoked;
    }

    string public constant name = "Arc Onchain Builder Pass";
    string public constant symbol = "ARCB";

    address public admin;
    address public authorizedSigner;

    /// @dev Total identities ever minted, including revoked ones.
    uint256 public totalSupply;
    /// @dev Minted and not revoked, exposed for operational reporting only.
    uint256 public activeSupply;

    mapping(uint256 => Pass) public passes;
    /// @dev identityHash => tokenId. 0 means "no pass yet" (tokenId is 1-indexed).
    mapping(bytes32 => uint256) public identityToTokenId;
    mapping(bytes32 => bool) public usedSignatures;

    event BuilderPassMinted(uint256 indexed tokenId, address indexed to, bytes32 identityHash, uint8 tier);
    event BuilderTierUpgraded(uint256 indexed tokenId, uint8 previousTier, uint8 newTier);
    event PassSuspended(uint256 indexed tokenId, string reason);
    event PassUnsuspended(uint256 indexed tokenId);
    event PassRevoked(uint256 indexed tokenId, string reason);
    event AuthorizedSignerUpdated(address indexed signer);
    event AdminUpdated(address indexed admin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "BuilderPass: not admin");
        _;
    }

    constructor(address _admin, address _authorizedSigner) {
        require(_admin != address(0), "BuilderPass: admin required");
        require(_authorizedSigner != address(0), "BuilderPass: signer required");
        admin = _admin;
        authorizedSigner = _authorizedSigner;
    }

    /// @notice Mints a new Builder Pass to `to` at the given tier.
    /// @dev Requires a signature from `authorizedSigner` over
    /// keccak256("BuilderPassMint", to, identityHash, tier, address(this)).
    /// The backend only signs after confirming at least one valid deployed
    /// contract and computing the qualifying tier deterministically.
    function authorizedMint(
        address to,
        bytes32 identityHash,
        uint8 tier,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 tokenId) {
        require(to != address(0), "BuilderPass: mint to zero address");
        require(identityToTokenId[identityHash] == 0, "BuilderPass: identity already has a pass");

        bytes32 messageHash = keccak256(abi.encodePacked("BuilderPassMint", to, identityHash, tier, address(this)));
        require(!usedSignatures[messageHash], "BuilderPass: signature already used");
        require(_recoverSigner(messageHash, v, r, s) == authorizedSigner, "BuilderPass: invalid signature");
        usedSignatures[messageHash] = true;

        totalSupply += 1;
        activeSupply += 1;
        tokenId = totalSupply;

        passes[tokenId] = Pass({
            owner: to,
            identityHash: identityHash,
            tier: tier,
            issuedAt: uint64(block.timestamp),
            suspended: false,
            revoked: false
        });
        identityToTokenId[identityHash] = tokenId;

        emit BuilderPassMinted(tokenId, to, identityHash, tier);
    }

    /// @notice Upgrades an existing Builder Pass to a higher tier in place.
    /// Same tokenId, same identity, no new supply consumed.
    /// @dev Requires a signature from `authorizedSigner` over
    /// keccak256("BuilderTierUpgrade", tokenId, newTier, address(this)).
    function authorizedUpgradeTier(
        uint256 tokenId,
        uint8 newTier,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        Pass storage pass = passes[tokenId];
        require(pass.owner != address(0), "BuilderPass: no such pass");
        require(!pass.revoked, "BuilderPass: revoked");
        require(newTier > pass.tier, "BuilderPass: tier can only move upward");

        bytes32 messageHash = keccak256(abi.encodePacked("BuilderTierUpgrade", tokenId, newTier, address(this)));
        require(!usedSignatures[messageHash], "BuilderPass: signature already used");
        require(_recoverSigner(messageHash, v, r, s) == authorizedSigner, "BuilderPass: invalid signature");
        usedSignatures[messageHash] = true;

        uint8 previousTier = pass.tier;
        pass.tier = newTier;
        emit BuilderTierUpgraded(tokenId, previousTier, newTier);
    }

    function suspend(uint256 tokenId, string calldata reason) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "BuilderPass: no such pass");
        passes[tokenId].suspended = true;
        emit PassSuspended(tokenId, reason);
    }

    function unsuspend(uint256 tokenId) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "BuilderPass: no such pass");
        passes[tokenId].suspended = false;
        emit PassUnsuspended(tokenId);
    }

    /// @notice Revokes a Builder Pass without freeing the identity for re-minting.
    function revoke(uint256 tokenId, string calldata reason) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "BuilderPass: no such pass");
        require(!passes[tokenId].revoked, "BuilderPass: already revoked");
        passes[tokenId].revoked = true;
        activeSupply -= 1;
        emit PassRevoked(tokenId, reason);
    }

    function setAuthorizedSigner(address signer) external onlyAdmin {
        require(signer != address(0), "BuilderPass: signer required");
        authorizedSigner = signer;
        emit AuthorizedSignerUpdated(signer);
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "BuilderPass: admin required");
        admin = newAdmin;
        emit AdminUpdated(newAdmin);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return passes[tokenId].owner;
    }

    // Intentionally non-transferable: no transfer/approve functions exist.
    // Builder Pass is an identity credential, not a tradable asset.

    function _recoverSigner(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        if (v < 27) {
            v += 27;
        }
        return ecrecover(ethSignedHash, v, r, s);
    }
}
