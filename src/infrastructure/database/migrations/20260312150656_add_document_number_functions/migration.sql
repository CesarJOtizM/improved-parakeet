-- CreateFunction: get_next_sale_number
-- Atomically increments the sequence for sales and returns a formatted sale number
CREATE OR REPLACE FUNCTION get_next_sale_number(p_org_id TEXT, p_year INT)
RETURNS TEXT AS $$
DECLARE
  v_sequence INT;
BEGIN
  -- Upsert: insert if not exists, increment if exists (atomic via ON CONFLICT)
  INSERT INTO "document_number_sequences" ("id", "orgId", "type", "year", "lastSequence", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::TEXT, p_org_id, 'SALE', p_year, 1, NOW(), NOW())
  ON CONFLICT ("orgId", "type", "year")
  DO UPDATE SET "lastSequence" = "document_number_sequences"."lastSequence" + 1,
                "updatedAt" = NOW()
  RETURNING "lastSequence" INTO v_sequence;

  RETURN 'SALE-' || p_year::TEXT || '-' || LPAD(v_sequence::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- CreateFunction: get_next_return_number
-- Atomically increments the sequence for returns and returns a formatted return number
CREATE OR REPLACE FUNCTION get_next_return_number(p_org_id TEXT, p_year INT)
RETURNS TEXT AS $$
DECLARE
  v_sequence INT;
BEGIN
  INSERT INTO "document_number_sequences" ("id", "orgId", "type", "year", "lastSequence", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::TEXT, p_org_id, 'RETURN', p_year, 1, NOW(), NOW())
  ON CONFLICT ("orgId", "type", "year")
  DO UPDATE SET "lastSequence" = "document_number_sequences"."lastSequence" + 1,
                "updatedAt" = NOW()
  RETURNING "lastSequence" INTO v_sequence;

  RETURN 'RETURN-' || p_year::TEXT || '-' || LPAD(v_sequence::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;
