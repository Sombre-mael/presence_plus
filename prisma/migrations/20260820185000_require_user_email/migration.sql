-- Every account must have an e-mail before activation and recovery can be used.
ALTER TABLE "User"
  ADD CONSTRAINT "User_email_required_check"
  CHECK ("email" IS NOT NULL) NOT VALID;

ALTER TABLE "User"
  VALIDATE CONSTRAINT "User_email_required_check";

ALTER TABLE "User"
  ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "User"
  DROP CONSTRAINT "User_email_required_check";
