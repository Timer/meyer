-- up:begin
create table "example" (
  id integer,
  payload text
);

insert into "example" values (1, 'foo');
insert into "example" values (2, 'bar');
-- up:end

-- down:begin
drop table "example";
-- down:end
