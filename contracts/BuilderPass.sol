// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Arc Pass — Onchain Builder Pass
/// @notice Non-transferable ERC-721-compatible identity credential for
/// verified Arc builders. There is no permanent contract supply cap; release
/// phases are enforced by the backend before it signs a mint authorization.
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
    address public pendingAdmin;
    address public authorizedSigner;
    address public pendingAuthorizedSigner;

    /// @dev Total identities ever minted, including revoked ones.
    uint256 public totalSupply;
    /// @dev Minted and not revoked, exposed for operational reporting only.
    uint256 public activeSupply;

    mapping(uint256 => Pass) public passes;
    mapping(bytes32 => uint256) public identityToTokenId;
    mapping(bytes32 => bool) public usedSignatures;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenUris;

    uint256 private constant _SECP256K1N_HALF =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event BuilderPassMinted(uint256 indexed tokenId, address indexed to, bytes32 identityHash, uint8 tier);
    event BuilderTierUpgraded(uint256 indexed tokenId, uint8 previousTier, uint8 newTier);
    event PassSuspended(uint256 indexed tokenId, string reason);
    event PassUnsuspended(uint256 indexed tokenId);
    event PassRevoked(uint256 indexed tokenId, string reason);
    event AuthorizedSignerUpdateStarted(address indexed signer);
    event AuthorizedSignerUpdated(address indexed signer);
    event AdminTransferStarted(address indexed admin);
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
    /// @dev The signed payload is chain-bound and includes the exact metadata
    /// URI, so a relayer cannot substitute a different recipient or metadata.
    function authorizedMint(
        address to,
        bytes32 identityHash,
        uint8 tier,
        string calldata metadataUri,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 tokenId) {
        require(to != address(0), "BuilderPass: mint to zero address");
        require(identityHash != bytes32(0), "BuilderPass: identity required");
        require(tier >= 1 && tier <= 5, "BuilderPass: invalid tier");
        require(bytes(metadataUri).length > 0, "BuilderPass: metadata required");
        require(identityToTokenId[identityHash] == 0, "BuilderPass: identity already has a pass");

        bytes32 messageHash = keccak256(
            abi.encodePacked("BuilderPassMint", block.chainid, to, identityHash, tier, address(this), metadataUri)
        );
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
        _balances[to] += 1;
        _tokenUris[tokenId] = metadataUri;

        emit Transfer(address(0), to, tokenId);
        emit BuilderPassMinted(tokenId, to, identityHash, tier);
    }

    /// @notice Upgrades an existing Builder Pass to a higher tier in place.
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
        require(newTier >= 1 && newTier <= 5, "BuilderPass: invalid tier");
        require(newTier > pass.tier, "BuilderPass: tier can only move upward");

        bytes32 messageHash = keccak256(abi.encodePacked("BuilderTierUpgrade", block.chainid, tokenId, newTier, address(this)));
        require(!usedSignatures[messageHash], "BuilderPass: signature already used");
        require(_recoverSigner(messageHash, v, r, s) == authorizedSigner, "BuilderPass: invalid signature");
        usedSignatures[messageHash] = true;

        uint8 previousTier = pass.tier;
        pass.tier = newTier;
        emit BuilderTierUpgraded(tokenId, previousTier, newTier);
    }

    function suspend(uint256 tokenId, string calldata reason) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "BuilderPass: no such pass");
        require(!passes[tokenId].revoked, "BuilderPass: revoked");
        passes[tokenId].suspended = true;
        emit PassSuspended(tokenId, reason);
    }

    function unsuspend(uint256 tokenId) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "BuilderPass: no such pass");
        require(!passes[tokenId].revoked, "BuilderPass: revoked");
        passes[tokenId].suspended = false;
        emit PassUnsuspended(tokenId);
    }

    /// @notice Revokes a Builder Pass without freeing the identity or supply.
    function revoke(uint256 tokenId, string calldata reason) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "BuilderPass: no such pass");
        require(!passes[tokenId].revoked, "BuilderPass: already revoked");
        passes[tokenId].revoked = true;
        activeSupply -= 1;
        emit PassRevoked(tokenId, reason);
    }

    function setAuthorizedSigner(address signer) external onlyAdmin {
        require(signer != address(0), "BuilderPass: signer required");
        pendingAuthorizedSigner = signer;
        emit AuthorizedSignerUpdateStarted(signer);
    }

    function acceptAuthorizedSigner() external {
        require(msg.sender == pendingAuthorizedSigner, "BuilderPass: not pending signer");
        authorizedSigner = pendingAuthorizedSigner;
        pendingAuthorizedSigner = address(0);
        emit AuthorizedSignerUpdated(authorizedSigner);
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "BuilderPass: admin required");
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "BuilderPass: not pending admin");
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminUpdated(admin);
    }

    // ERC-721 read surface. Transfers and approvals are deliberately disabled
    // below because these are soulbound credentials.
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "BuilderPass: zero balance owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = passes[tokenId].owner;
        require(owner != address(0), "BuilderPass: nonexistent token");
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(passes[tokenId].owner != address(0), "BuilderPass: nonexistent token");
        return _tokenUris[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    function transferFrom(address, address, uint256) external pure {
        revert("BuilderPass: non-transferable");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("BuilderPass: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("BuilderPass: non-transferable");
    }

    function approve(address, uint256) external pure {
        revert("BuilderPass: non-transferable");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("BuilderPass: non-transferable");
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(passes[tokenId].owner != address(0), "BuilderPass: nonexistent token");
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function _recoverSigner(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "BuilderPass: invalid signature v");
        require(uint256(s) <= _SECP256K1N_HALF, "BuilderPass: non-canonical signature");
        address signer = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)), v, r, s);
        require(signer != address(0), "BuilderPass: invalid signature");
        return signer;
    }
}
