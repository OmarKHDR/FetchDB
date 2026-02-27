<p align="center">
  <a href="https://miro.com/app/board/uXjVGANasYQ=/?share_link_id=650681616162" target="blank"><img src="./public/images/logo.png" width="240" alt="FetchDB Logo" /></a>
</p>

## Project creation process and requirements
<a href="https://miro.com/app/board/uXjVGANasYQ=/?share_link_id=650681616162" target="blink">WHITE BOARD</a>
## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

```
## Project Structure
- Parser Service: parsing the tokens from sent query to evaluate an AST node object which has the needed information to execute the statement
  - Math Service: recursively doing evaluation of WHERE (and having in the future)
- SQLInterpreter Service: connecting the tokenizer, the parser and the storage engine
  - the lexer is part of this service and it does all the breaking of the statement into tokens concidering edge cases like quotes and spaces and the single character and double characters tokens
- mutex: is just a queue for promises with keywords (tables names) this is only used because how the current file append structure work
- table handler service: this converts back and forth between objects and buffers using the system supported data types as a base
- file handler service: this is the base of our project and the base of the storage logic appending to files and having the indexing logic and schema handling
- winston logger service: a service used to log created to help extend loggers with custom levels that would help saving user queries


## supported endpoints 
`POST /execute/ddl/`
executes a DDL statement to create or change db schema
```SQL
CREATE TABLE employees (id SERIAL PRIMARY KEY, name VARCHAR(15) DEFAULT "username", created_at TIMESTAMP);
```
`POST /execute/dml/`
execute a dml statment to insert, change, view, delete existing data 

```SQL
INSERT INTO employees (name, created_at) VALUES ("omar", "2025-11-23T10:00:00Z");
SELECT * FROM employees;
UPDATE TABLE employees SET name="ahmed" WHERE id=0;
DELETE FROM employees WHERE name="ahmed";
```

`GET /history`
get the schema history in a list, each change to the DB schema with adding new tables will trigger new version

`POST /schema/version`
change the current version of the schema to another one, currently it will only hide the tables that created in the next versions or re-show them



## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
