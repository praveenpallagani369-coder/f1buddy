-- Atomic increment function for answer_count to prevent race conditions
CREATE OR REPLACE FUNCTION increment_answer_count(post_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET answer_count = answer_count + 1,
      updated_at = NOW()
  WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
