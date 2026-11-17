package com.soft6creators.futurespace.app.depositwallet;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;

import com.soft6creators.futurespace.app.user.User;

/**
 * A member-specific deposit address that replaces the platform default for one
 * currency. When a row exists here the default is not shown at all -- not even
 * its QR code, which would be a code for a different address than the one the
 * member is being asked to pay.
 */
@Entity
public class UserDepositWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne
    private User user;

    /** Matches DepositWallet.symbol. */
    @Column(length = 32)
    private String symbol;

    @Column(length = 512)
    private String address;

    /** Optional QR for the custom address; none is shown when left empty. */
    @Column(length = 512)
    private String qrPath;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getQrPath() {
        return qrPath;
    }

    public void setQrPath(String qrPath) {
        this.qrPath = qrPath;
    }
}
