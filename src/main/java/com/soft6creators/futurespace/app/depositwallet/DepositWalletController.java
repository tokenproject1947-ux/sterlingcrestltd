package com.soft6creators.futurespace.app.depositwallet;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Deposit addresses: the platform defaults an operator maintains, the
 * per-member overrides that replace them, and the QR images attached to either.
 */
@RestController
public class DepositWalletController {

    @Autowired
    private DepositWalletService depositWalletService;

    /* ---- Member facing -------------------------------------------------- */

    /** The currencies this member should actually pay, already resolved. */
    @CrossOrigin(maxAge = 3600)
    @RequestMapping("/user/{email}/deposit-wallets")
    public List<Map<String, Object>> getDepositWallets(@PathVariable String email) {
        return depositWalletService.resolveForMember(email);
    }

    /* ---- Operator: the default wallets ---------------------------------- */

    @CrossOrigin(maxAge = 3600)
    @RequestMapping("/admin/deposit-wallets")
    public List<DepositWallet> getAllWallets() {
        return depositWalletService.getAll();
    }

    /** Create or update a default wallet; the id decides which. */
    @CrossOrigin(maxAge = 3600)
    @RequestMapping(method = RequestMethod.POST, value = "/admin/deposit-wallet")
    public DepositWallet saveWallet(@RequestBody DepositWallet wallet) {
        return depositWalletService.save(wallet);
    }

    @CrossOrigin(maxAge = 3600)
    @RequestMapping(method = RequestMethod.DELETE, value = "/admin/deposit-wallet/{walletId}")
    public boolean deleteWallet(@PathVariable int walletId) {
        depositWalletService.delete(walletId);
        return true;
    }

    /* ---- Operator: per-member overrides --------------------------------- */

    @CrossOrigin(maxAge = 3600)
    @RequestMapping("/admin/user/{email}/deposit-wallets")
    public List<UserDepositWallet> getOverrides(@PathVariable String email) {
        return depositWalletService.getOverrides(email);
    }

    /**
     * Set the override for one currency. A blank address clears it and puts
     * the default back.
     */
    @CrossOrigin(maxAge = 3600)
    @RequestMapping(method = RequestMethod.PUT, value = "/admin/user/{email}/deposit-wallet")
    public UserDepositWallet setOverride(@PathVariable String email, @RequestBody UserDepositWallet request) {
        return depositWalletService.setOverride(email, request.getSymbol(), request.getAddress(), request.getQrPath());
    }

    @CrossOrigin(maxAge = 3600)
    @RequestMapping(method = RequestMethod.DELETE, value = "/admin/user/{email}/deposit-wallet/{symbol}")
    public boolean clearOverride(@PathVariable String email, @PathVariable String symbol) {
        depositWalletService.clearOverride(email, symbol);
        return true;
    }

    /* ---- QR images ------------------------------------------------------ */

    @CrossOrigin(maxAge = 3600)
    @RequestMapping(method = RequestMethod.POST, value = "/admin/deposit-wallet/qr")
    public ResponseEntity<?> uploadQr(@RequestParam("file") MultipartFile file) {
        try {
            String path = depositWalletService.storeQrImage(file);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("qrPath", path);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException bad) {
            return ResponseEntity.badRequest().body(message(bad.getMessage()));
        } catch (IOException failed) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(message("Could not store the image"));
        }
    }

    /** Serve a stored QR image. Only names we issued ever resolve. */
    @RequestMapping("/deposit-qr/{name}")
    public ResponseEntity<byte[]> getQr(@PathVariable String name) {
        Path file = depositWalletService.readQrImage(name);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] bytes = Files.readAllBytes(file);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .contentType(contentTypeOf(name))
                    .body(bytes);
        } catch (IOException failed) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private static Map<String, Object> message(String text) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", text);
        return body;
    }

    private static MediaType contentTypeOf(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
}
