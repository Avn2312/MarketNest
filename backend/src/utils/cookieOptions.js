const getCookieSecurityOptions = (req) => {
    const requestOrigin = req.headers.origin || "";
    const isHttpsOrigin = requestOrigin.startsWith("https://");

    return {
        httpOnly: true,
        secure: isHttpsOrigin,
        sameSite: isHttpsOrigin ? "none" : "lax",
        path: "/",
    };
};

export const getAuthCookieOptions = (req) => ({
    ...getCookieSecurityOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const getAuthCookieClearOptions = (req) => getCookieSecurityOptions(req);
