ALTER TABLE "Review"
ADD CONSTRAINT "Review_rating_between_1_and_5"
CHECK ("rating" BETWEEN 1 AND 5);