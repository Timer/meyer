-- up:begin
create table "example" (
  id integer,
  payload text
);

insert into "example" values (1, 'foo');
insert into "example" values (2, 'bar');
insert into "example" values (3, 'baz');
-- up:end

-- down:begin
drop table "example";
-- down:end
