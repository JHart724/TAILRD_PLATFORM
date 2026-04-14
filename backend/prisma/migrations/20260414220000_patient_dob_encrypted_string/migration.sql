-- Convert patients.dateOfBirth from timestamp to text so the PHI encryption
-- middleware (AES-256-GCM) can store "enc:iv:tag:ciphertext" strings.
-- HIPAA 164.312(a)(2)(iv): PHI must be encrypted at rest.
--
-- Existing rows (plaintext timestamps) are converted to ISO 8601 strings.
-- On first read through the middleware, decryptRecord() will see a non-"enc:"
-- prefixed string and pass it through, then DATETIME_PHI_FIELDS parses it
-- back to a Date. New writes will be encrypted.
--
-- Idempotent: if already converted, no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients'
      AND column_name = 'dateOfBirth'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "patients"
      ALTER COLUMN "dateOfBirth" TYPE TEXT
      USING to_char("dateOfBirth" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  END IF;
END $$;
