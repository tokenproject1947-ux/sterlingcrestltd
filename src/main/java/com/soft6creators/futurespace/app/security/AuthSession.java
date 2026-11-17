package com.soft6creators.futurespace.app.security;

import javax.servlet.http.HttpSession;

/**
 * The two facts a session has to carry: who is signed in, and whether they are
 * an operator. Sign-in and sign-up write them; the authorization filter reads
 * them. Keeping the keys here means nothing else can spell them differently.
 */
public final class AuthSession {

    public static final String EMAIL = "sc.auth.email";
    public static final String ROLE = "sc.auth.role";

    /** Anything other than USER is treated as an operator, matching the way
        the sign-in redirect already chooses between the dashboard and the
        console. */
    public static final String ROLE_ADMIN = "ADMIN";

    private AuthSession() {
    }

    public static void establish(HttpSession session, String email, String role) {
        if (session == null || email == null) return;
        session.setAttribute(EMAIL, email);
        session.setAttribute(ROLE, role == null ? "USER" : role);
    }

    public static String emailOf(HttpSession session) {
        return session == null ? null : (String) session.getAttribute(EMAIL);
    }

    public static String roleOf(HttpSession session) {
        return session == null ? null : (String) session.getAttribute(ROLE);
    }

    public static boolean isAdmin(HttpSession session) {
        return ROLE_ADMIN.equals(roleOf(session));
    }
}
