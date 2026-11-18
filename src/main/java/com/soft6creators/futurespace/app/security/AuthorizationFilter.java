package com.soft6creators.futurespace.app.security;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Guards the API.
 *
 * Until this existed, every endpoint was reachable by anyone who could open
 * port 8081: the admin console, the withdrawal approval call, and the member
 * read that returns passwords were all unauthenticated. There are three tiers:
 *
 *   PUBLIC   sign-in, sign-up, verification, password reset, the lookup lists
 *            and uploaded QR images -- anything an unauthenticated page needs.
 *   ADMIN    the console and every call that moves money or edits a member.
 *   SIGNED IN everything else. Where the path names a member's email, the
 *            session must belong to that member.
 *
 * Unknown routes fall into the ADMIN tier rather than the public one, so a
 * handler added later is closed until someone decides it should be open.
 */
@Component
public class AuthorizationFilter extends OncePerRequestFilter {

    /** Routes an unauthenticated page has to reach before there is a session. */
    private static final List<String> PUBLIC_EXACT = Arrays.asList(
            "/signin",
            "/logout",
            "/forgot-password",
            "/reset-password",
            "/country",
            "/state",
            "/accounttype",
            "/cryptos",
            "/interest",
            "/contact",
            "/subscribe");

    private static final String[] PUBLIC_PREFIXES = {
            "/verify/",
            "/country/",
            "/deposit-qr/",
    };

    /** Resend is reachable from the verify screen, before anyone is signed in. */
    private static final String RESEND_SUFFIX = "/resend";

    private static final String[] ADMIN_PREFIXES = {
            "/admin/",
            "/withdrawals/",
            "/address/delete/",
    };

    private static final List<String> ADMIN_EXACT = Arrays.asList(
            "/withdrawal",
            "/investment",
            "/investments",
            "/account",
            "/tradingaccount",
            "/users");

    /** The signed-in member's own endpoints. */
    private static final String[] MEMBER_PREFIXES = {
            "/user/",
            "/account/",
            "/address/user/",
    };

    private static final List<String> MEMBER_EXACT = Arrays.asList("/user", "/address");

    /**
     * Asset types. This is a whitelist on purpose: guessing "has a dot in the
     * last segment" treats an email address as a filename, and a path such as
     * /admin/user/someone@example.test then bypasses the guard entirely.
     */
    private static final String[] STATIC_EXTENSIONS = {
            "html", "htm", "css", "js", "map", "png", "jpg", "jpeg", "gif", "svg",
            "ico", "webp", "woff", "woff2", "ttf", "eot", "otf", "txt", "xml", "pdf",
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = pathOf(request);
        String method = request.getMethod();

        if (isStatic(path) || isPublic(method, path)) {
            chain.doFilter(request, response);
            return;
        }

        HttpSession session = request.getSession(false);
        String email = AuthSession.emailOf(session);
        if (email == null) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED, "Sign in to continue");
            return;
        }

        if (isAdminOnly(method, path)) {
            if (!AuthSession.isAdmin(session)) {
                reject(response, HttpServletResponse.SC_FORBIDDEN, "Operator access only");
                return;
            }
        } else if (!AuthSession.isAdmin(session) && !owns(path, email)) {
            reject(response, HttpServletResponse.SC_FORBIDDEN, "That record belongs to another member");
            return;
        }

        chain.doFilter(request, response);
    }

    private static String pathOf(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            uri = uri.substring(context.length());
        }
        return uri.isEmpty() ? "/" : uri;
    }

    /* Pages and assets, not part of the API. Matched against a whitelist of
       extensions rather than "the last segment has a dot".
       The site root is the welcome page and has no extension of its own, so it
       has to be named here -- without this, GET / falls through to the guarded
       tiers and answers the whole site with "Sign in to continue". */
    private static boolean isStatic(String path) {
        if (path.equals("/") || path.equals("/index")) return true;
        int slash = path.lastIndexOf('/');
        int dot = path.lastIndexOf('.');
        if (dot <= slash || dot == path.length() - 1) return false;
        String extension = path.substring(dot + 1).toLowerCase(Locale.ROOT);
        for (String allowed : STATIC_EXTENSIONS) {
            if (allowed.equals(extension)) return true;
        }
        return false;
    }

    private static boolean isPublic(String method, String path) {
        if (PUBLIC_EXACT.contains(path)) return true;
        for (String prefix : PUBLIC_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }
        /* The verification screen can resend before anyone is signed in. */
        if ("GET".equals(method) && path.endsWith(RESEND_SUFFIX)) return true;
        /* Creating an account is the only unauthenticated write. */
        return "POST".equals(method) && path.equals("/user");
    }

    private static boolean isAdminOnly(String method, String path) {
        if (path.startsWith("/admin/")) return true;
        for (String prefix : ADMIN_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }
        if (ADMIN_EXACT.contains(path)) return true;
        /* /withdrawal splits by verb: a member posts their own payout request,
           while the console reads a record by id or puts an approval. */
        if (path.equals("/withdrawal") || path.startsWith("/withdrawal/")) {
            return !"POST".equals(method);
        }
        /* The member's own endpoints are the only other thing that exists, so
           anything that is not one of those is not something to leave open. */
        return !isMemberRoute(path);
    }

    private static boolean isMemberRoute(String path) {
        for (String prefix : MEMBER_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }
        return MEMBER_EXACT.contains(path);
    }

    /**
     * Does this session belong to the member named in the path? Paths that do
     * not name anyone fall to the caller, since the filter cannot tell whose
     * account an id belongs to without querying for it.
     */
    private static boolean owns(String path, String email) {
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length; i++) {
            String segment = parts[i];
            if (segment.indexOf('@') > 0) {
                return segment.equalsIgnoreCase(email);
            }
        }
        return true;
    }

    private static void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
