import crypto from "crypto";

export const generateStreamKey = () => {
  return `sk_${crypto.randomBytes(16).toString("hex")}`;
};
