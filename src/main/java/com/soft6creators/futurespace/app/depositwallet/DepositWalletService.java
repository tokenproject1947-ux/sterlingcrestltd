package com.soft6creators.futurespace.app.depositwallet;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.soft6creators.futurespace.app.user.User;
import com.soft6creators.futurespace.app.user.UserRepository;

/**
 * Deposit addresses and the member-specific overrides that replace them.
 *
 * Resolution is deliberately blunt: a member with an override for a currency
 * sees that address and only that address, and the default's QR code goes away
 * with it. Mixing a default QR with a custom address is how funds end up sent
 * to the wrong place, so an override without its own QR shows no QR at all.
 */
@Service
public class DepositWalletService {

    /** Uploads live outside the classpath so a rebuild cannot lose them. */
    static final Path UPLOAD_DIR = Paths.get("uploads", "qr");

    private static final String[] ALLOWED_EXTENSIONS = { "png", "jpg", "jpeg", "gif", "webp" };
    private static final long MAX_UPLOAD_BYTES = 4L * 1024 * 1024;

    @Autowired
    private DepositWalletRepository depositWalletRepository;
    @Autowired
    private UserDepositWalletRepository userDepositWalletRepository;
    @Autowired
    private UserRepository userRepository;

    /* ---- Operator side ------------------------------------------------- */

    public List<DepositWallet> getAll() {
        return depositWalletRepository.findAllByOrderBySortOrderAscWalletIdAsc();
    }

    public DepositWallet save(DepositWallet wallet) {
        return depositWalletRepository.save(wallet);
    }

    public void delete(int walletId) {
        depositWalletRepository.deleteById(walletId);
    }

    public List<UserDepositWallet> getOverrides(String email) {
        return userDepositWalletRepository.findAllByUserEmail(email);
    }

    /**
     * Set, replace or clear one override. An empty address clears it, because
     * that is what "go back to the default" means to an operator filling in a
     * form, and clearing is far more common than deleting a row by hand.
     */
    public UserDepositWallet setOverride(String email, String symbol, String address, String qrPath) {
        Optional<UserDepositWallet> existing =
                userDepositWalletRepository.findByUserEmailAndSymbol(email, symbol);
        if (address == null || address.trim().isEmpty()) {
            if (existing.isPresent()) {
                userDepositWalletRepository.delete(existing.get());
            }
            return null;
        }
        UserDepositWallet override = existing.orElseGet(UserDepositWallet::new);
        /* Both keys have to be on the row: without them the lookup that finds
           an existing override can never match, and every save would add
           another orphaned row instead of replacing this one. */
        Optional<User> user = userRepository.findByEmail(email);
        if (!user.isPresent()) {
            return null;
        }
        override.setUser(user.get());
        override.setSymbol(symbol == null ? null : symbol.trim().toUpperCase(Locale.ROOT));
        override.setAddress(address.trim());
        override.setQrPath(isBlank(qrPath) ? null : qrPath.trim());
        return userDepositWalletRepository.save(override);
    }

    public void clearOverride(String email, String symbol) {
        Optional<UserDepositWallet> existing =
                userDepositWalletRepository.findByUserEmailAndSymbol(email, symbol);
        if (existing.isPresent()) {
            userDepositWalletRepository.delete(existing.get());
        }
    }

    /* ---- Member side --------------------------------------------------- */

    /**
     * The currencies a member is shown, each already resolved to the address
     * they should actually pay. `custom` says which source won, so the panel
     * can label an address that was set up for this member alone.
     */
    public List<Map<String, Object>> resolveForMember(String email) {
        Map<String, UserDepositWallet> overrides = new HashMap<>();
        for (UserDepositWallet override : userDepositWalletRepository.findAllByUserEmail(email)) {
            if (override.getSymbol() != null) {
                overrides.put(override.getSymbol().toUpperCase(Locale.ROOT), override);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (DepositWallet wallet : depositWalletRepository.findAllByOrderBySortOrderAscWalletIdAsc()) {
            if (!wallet.isActive()) continue;
            String key = wallet.getSymbol() == null ? "" : wallet.getSymbol().toUpperCase(Locale.ROOT);
            UserDepositWallet override = overrides.get(key);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("symbol", wallet.getSymbol());
            row.put("label", wallet.getLabel());
            row.put("network", wallet.getNetwork());
            row.put("custom", override != null);
            if (override != null) {
                row.put("address", override.getAddress());
                row.put("qrPath", override.getQrPath());
            } else {
                row.put("address", wallet.getAddress());
                row.put("qrPath", wallet.getQrPath());
            }
            rows.add(row);
        }
        return rows;
    }

    /* ---- QR image upload ------------------------------------------------ */

    /**
     * Store an operator-supplied QR image and return its public path. The file
     * is renamed on arrival: the original name is untrusted input, and a name
     * we chose is the only thing the download endpoint will ever be asked for.
     */
    public String storeQrImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was sent");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("Image is larger than 4 MB");
        }
        String extension = extensionOf(file.getOriginalFilename());
        if (extension == null) {
            throw new IllegalArgumentException("Only PNG, JPEG, GIF or WebP images are accepted");
        }

        Files.createDirectories(UPLOAD_DIR);
        String name = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path target = UPLOAD_DIR.resolve(name);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return "/deposit-qr/" + name;
    }

    /** Read a stored QR image back, or null when the name is not one we issued. */
    public Path readQrImage(String name) {
        if (isBlank(name) || name.contains("/") || name.contains("\\") || name.contains("..")) {
            return null;
        }
        Path resolved = UPLOAD_DIR.resolve(name).normalize();
        if (!resolved.startsWith(UPLOAD_DIR.normalize())) {
            return null;
        }
        return Files.isRegularFile(resolved) ? resolved : null;
    }

    private static String extensionOf(String original) {
        if (original == null) return null;
        String lower = original.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        if (dot < 0 || dot == lower.length() - 1) return null;
        String extension = lower.substring(dot + 1);
        for (String allowed : ALLOWED_EXTENSIONS) {
            if (allowed.equals(extension)) return extension;
        }
        return null;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
