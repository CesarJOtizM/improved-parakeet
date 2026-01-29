-- CreateFunction: get_next_sale_number
-- This function generates sequential sale numbers in format SALE-YYYY-NNN
-- It uses the existing sale_number_seq sequence for atomic number generation

CREATE OR REPLACE FUNCTION get_next_sale_number(p_org_id TEXT, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  next_seq INTEGER;
  result_number TEXT;
BEGIN
  -- Get next value from sequence
  SELECT nextval('sale_number_seq') INTO next_seq;

  -- Format the sale number: SALE-YYYY-NNN (3 digits minimum)
  result_number := 'SALE-' || p_year::TEXT || '-' || LPAD(next_seq::TEXT, 3, '0');

  RETURN result_number;
END;
$$ LANGUAGE plpgsql;

-- CreateFunction: get_next_return_number
-- This function generates sequential return numbers in format RETURN-YYYY-NNN

CREATE OR REPLACE FUNCTION get_next_return_number(p_org_id TEXT, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  next_seq INTEGER;
  result_number TEXT;
BEGIN
  -- Get next value from sequence
  SELECT nextval('return_number_seq') INTO next_seq;

  -- Format the return number: RETURN-YYYY-NNN (3 digits minimum)
  -- Must match the format expected by ReturnNumber value object validation
  result_number := 'RETURN-' || p_year::TEXT || '-' || LPAD(next_seq::TEXT, 3, '0');

  RETURN result_number;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_next_sale_number(TEXT, INTEGER) IS 'Generates sequential sale numbers in format SALE-YYYY-NNN for the given organization and year';
COMMENT ON FUNCTION get_next_return_number(TEXT, INTEGER) IS 'Generates sequential return numbers in format RETURN-YYYY-NNN for the given organization and year';
