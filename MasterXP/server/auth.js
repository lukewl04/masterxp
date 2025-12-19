import "dotenv/config";
import { auth } from "express-oauth2-jwt-bearer";

const domain = (process.env.AUTH0_DOMAIN || "").trim();
const audience = (process.env.AUTH0_AUDIENCE || "").trim();

export const checkJwt = auth({
  issuerBaseURL: `https://${domain}`,
  audience,
});
