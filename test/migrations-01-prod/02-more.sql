-- up:begin
create table "example2" (
  id integer,
  payload text
);

insert into "example2" values (1, 'foo');
insert into "example2" values (2, 'bar');
-- up:end

-- down:begin
drop table "example2";
-- down:end
