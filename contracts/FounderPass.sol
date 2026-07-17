// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Arc Pass — Founder Pass
/// @notice Non-transferable ERC-721-compatible identity credential for
/// verified Arc founders. The metadata URI is fixed at mint time.
contract FounderPass {
    enum Variant {
        Normal,
        PremiumBlack
    }

    struct Pass {
        address owner;
        bytes32 identityHash;
        Variant variant;
        uint64 issuedAt;
        bool revoked;
    }

    string public constant name = "Arc Founder Pass";
    string public constant symbol = "ARCF";

    address public admin;
    address public pendingAdmin;
    address public authorizedSigner;
    address public pendingAuthorizedSigner;

    uint256 public totalSupply;
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
    event FounderPassMinted(uint256 indexed tokenId, address indexed to, bytes32 identityHash, Variant variant);
    event PassRevoked(uint256 indexed tokenId, string reason);
    event AuthorizedSignerUpdateStarted(address indexed signer);
    event AuthorizedSignerUpdated(address indexed signer);
    event AdminTransferStarted(address indexed admin);
    event AdminUpdated(address indexed admin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "FounderPass: not admin");
        _;
    }

    constructor(address _admin, address _authorizedSigner) {
        require(_admin != address(0), "FounderPass: admin required");
        require(_authorizedSigner != address(0), "FounderPass: signer required");
        admin = _admin;
        authorizedSigner = _authorizedSigner;
    }

    /// @notice Mints a new, permanent Founder Pass to `to`.
    /// @dev The signed payload is chain-bound and includes the exact metadata
    /// URI, so a relayer cannot substitute a different recipient or metadata.
    function authorizedMint(
        address to,
        bytes32 identityHash,
        Variant variant,
        string calldata metadataUri,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 tokenId) {
        require(to != address(0), "FounderPass: mint to zero address");
        require(identityHash != bytes32(0), "FounderPass: identity required");
        require(bytes(metadataUri).length > 0, "FounderPass: metadata required");
        require(identityToTokenId[identityHash] == 0, "FounderPass: identity already has a pass");

        bytes32 messageHash = keccak256(
            abi.encodePacked("FounderPassMint", block.chainid, to, identityHash, uint8(variant), address(this), metadataUri)
        );
        require(!usedSignatures[messageHash], "FounderPass: signature already used");
        require(_recoverSigner(messageHash, v, r, s) == authorizedSigner, "FounderPass: invalid signature");
        usedSignatures[messageHash] = true;

        totalSupply += 1;
        tokenId = totalSupply;
        passes[tokenId] = Pass({
            owner: to,
            identityHash: identityHash,
            variant: variant,
            issuedAt: uint64(block.timestamp),
            revoked: false
        });
        identityToTokenId[identityHash] = tokenId;
        _balances[to] += 1;
        _tokenUris[tokenId] = metadataUri;

        emit Transfer(address(0), to, tokenId);
        emit FounderPassMinted(tokenId, to, identityHash, variant);
    }

    /// @notice Administrative correction only. Revocation never frees the
    /// identity slot or burns the on-chain record.
    function revoke(uint256 tokenId, string calldata reason) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "FounderPass: no such pass");
        require(!passes[tokenId].revoked, "FounderPass: already revoked");
        passes[tokenId].revoked = true;
        emit PassRevoked(tokenId, reason);
    }

    /// @notice Starts a two-step authorized-signer rotation.
    function setAuthorizedSigner(address signer) external onlyAdmin {
        require(signer != address(0), "FounderPass: signer required");
        pendingAuthorizedSigner = signer;
        emit AuthorizedSignerUpdateStarted(signer);
    }

    function acceptAuthorizedSigner() external {
        require(msg.sender == pendingAuthorizedSigner, "FounderPass: not pending signer");
        authorizedSigner = pendingAuthorizedSigner;
        pendingAuthorizedSigner = address(0);
        emit AuthorizedSignerUpdated(authorizedSigner);
    }

    /// @notice Starts a two-step admin rotation so an accidental address does
    /// not permanently lock the contract.
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "FounderPass: admin required");
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "FounderPass: not pending admin");
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminUpdated(admin);
    }

    // ERC-721 read surface. Transfers and approvals are deliberately disabled
    // below because these are soulbound credentials.
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "FounderPass: zero balance owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = passes[tokenId].owner;
        require(owner != address(0), "FounderPass: nonexistent token");
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(passes[tokenId].owner != address(0), "FounderPass: nonexistent token");
        return _tokenUris[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    function transferFrom(address, address, uint256) external pure {
        revert("FounderPass: non-transferable");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("FounderPass: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("FounderPass: non-transferable");
    }

    function approve(address, uint256) external pure {
        revert("FounderPass: non-transferable");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("FounderPass: non-transferable");
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(passes[tokenId].owner != address(0), "FounderPass: nonexistent token");
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function _recoverSigner(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "FounderPass: invalid signature v");
        require(uint256(s) <= _SECP256K1N_HALF, "FounderPass: non-canonical signature");
        address signer = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)), v, r, s);
        require(signer != address(0), "FounderPass: invalid signature");
        return signer;
    }
}
