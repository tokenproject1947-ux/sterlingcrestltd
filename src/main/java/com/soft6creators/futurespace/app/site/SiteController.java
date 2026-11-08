package com.soft6creators.futurespace.app.site;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.soft6creators.futurespace.app.mailsender.MailSenderService;

@RestController
public class SiteController {

	private static final String SUPPORT_EMAIL = "support@sterlingcrestltd.com";

	@Autowired
	private MailSenderService mailSenderService;

	@RequestMapping(method = RequestMethod.GET, value = "/logout")
	public void logout(HttpServletRequest request, HttpServletResponse response) throws Exception {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		response.sendRedirect("/get-started.html");
	}

	@RequestMapping(method = RequestMethod.POST, value = "/contact")
	public void contact(@RequestParam(name = "name", required = false) String name,
			@RequestParam(name = "email", required = false) String email,
			@RequestParam(name = "message", required = false) String message,
			@RequestParam(name = "form-anti-honeypot", required = false) String honeypot,
			HttpServletResponse response) throws Exception {
		// honeypot filled in means a bot submitted the form - silently ignore
		if (honeypot == null || honeypot.isEmpty()) {
			try {
				mailSenderService.sendEmail(SUPPORT_EMAIL, "Sterling Crest Ltd (Contact Form)",
						"<p><b>Name:</b> " + safe(name) + "</p><p><b>Email:</b> " + safe(email) + "</p><p><b>Message:</b><br/>"
								+ safe(message) + "</p>");
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		response.sendRedirect("/#contact");
	}

	@RequestMapping(method = RequestMethod.POST, value = "/subscribe")
	public void subscribe(@RequestParam(name = "email", required = false) String email,
			HttpServletResponse response) throws Exception {
		try {
			mailSenderService.sendEmail(SUPPORT_EMAIL, "Sterling Crest Ltd (Newsletter Subscription)",
					"<p><b>New subscriber:</b> " + safe(email) + "</p>");
		} catch (Exception e) {
			e.printStackTrace();
		}
		response.sendRedirect("/");
	}

	private String safe(String value) {
		if (value == null) {
			return "";
		}
		return value.replace("\\", "").replace("\"", "'").replace("<", "&lt;").replace(">", "&gt;");
	}
}
