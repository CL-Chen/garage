import { config as setup } from "dotenv";

setup();

export const config = {
  alchemyKey: process.env.ALCHEMY_KEY,
};
