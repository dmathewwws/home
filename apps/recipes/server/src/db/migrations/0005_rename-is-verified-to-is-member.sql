-- Custom SQL migration file, put your code below! --
ALTER TABLE `users` RENAME COLUMN `is_verified` TO `is_member`;
