// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Arc Pass — Founder Pass
/// @notice Non-transferable identity credential for verified Arc founders.
/// One credential per verified identity; permanent once minted. The variant
/// (Normal or Premium Black) is fixed at mint time and can never change.
///
/// Founder eligibility itself is never decided on-chain — it's an
/// admin-controlled invite process in the Arc Pass backend. This contract
/// only enforces the guarantees that must hold regardless of what the
/// backend does: one pass per identity, permanence, and that only a
/// signature from the backend's authorized signer can mint.
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
    address public authorizedSigner;

    uint256 public totalSupply;
    mapping(uint256 => Pass) public passes;
    /// @dev identityHash => tokenId. 0 means "no pass yet" (tokenId is 1-indexed).
    mapping(bytes32 => uint256) public identityToTokenId;
    mapping(bytes32 => bool) public usedSignatures;

    event FounderPassMinted(uint256 indexed tokenId, address indexed to, bytes32 identityHash, Variant variant);
    event PassRevoked(uint256 indexed tokenId, string reason);
    event AuthorizedSignerUpdated(address indexed signer);
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
    /// @dev Requires a signature from `authorizedSigner` over
    /// keccak256("FounderPassMint", to, identityHash, variant, address(this)),
    /// EIP-191 personal-sign encoded. The backend only produces this
    /// signature after invite + eligibility checks pass off-chain.
    function authorizedMint(
        address to,
        bytes32 identityHash,
        Variant variant,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 tokenId) {
        require(to != address(0), "FounderPass: mint to zero address");
        require(identityToTokenId[identityHash] == 0, "FounderPass: identity already has a pass");

        bytes32 messageHash = keccak256(abi.encodePacked("FounderPassMint", to, identityHash, uint8(variant), address(this)));
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

        emit FounderPassMinted(tokenId, to, identityHash, variant);
    }

    /// @notice Administrative correction only. Does not free the identity
    /// slot, does not allow re-minting, and does not alter the permanent
    /// record — it only marks the credential invalid for external readers.
    function revoke(uint256 tokenId, string calldata reason) external onlyAdmin {
        require(passes[tokenId].owner != address(0), "FounderPass: no such pass");
        require(!passes[tokenId].revoked, "FounderPass: already revoked");
        passes[tokenId].revoked = true;
        emit PassRevoked(tokenId, reason);
    }

    function setAuthorizedSigner(address signer) external onlyAdmin {
        require(signer != address(0), "FounderPass: signer required");
        authorizedSigner = signer;
        emit AuthorizedSignerUpdated(signer);
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "FounderPass: admin required");
        admin = newAdmin;
        emit AdminUpdated(newAdmin);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return passes[tokenId].owner;
    }

    // Intentionally non-transferable: no transfer/approve functions exist.
    // Founder Pass is an identity credential, not a tradable asset.

    function _recoverSigner(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        if (v < 27) {
            v += 27;
        }
        return ecrecover(ethSignedHash, v, r, s);
    }
}
