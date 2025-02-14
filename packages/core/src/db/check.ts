import * as fs from "node:fs";

export const check = () => {
  const env = process.env;
  const db_url = env.DATABASE_URL;
  if (!db_url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // check if the database URL is a valid URL
  try {
    new URL(db_url);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${db_url}`);
  }

  // check if the database file exists
  const dbFile = db_url.replace("file:", "");
  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database file ${dbFile} does not exist`);
  }
  return {
    DATABASE_URL: dbFile,
  };
};
