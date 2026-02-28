# FETCH DB FUTURE PLANS
## what did i make?
- lexer: deviding the statement into valid tokens
- parser: creating statement objects
	- currently made:
		- SELECT
		- CREATE
		- DELETE
		- INSERT
		- UPDATE
- storage-engine: using the statement object it executes it in the filehandler directly using some helper services
- sql-interpreter: grouping lexer and parser and passing the statement object into the file storage
- currently the schema storage is not allowing versioning, while hanling logic with respect to in memory schema object makes it flexible to versioning, I was overwriting the schema.json
	- i thought about using ndjson, but if i know the exact version why not use that to execute same table indexing logic?

## MODIFICATIONS:
- [x] change the scheme read and update to create two files schema.ojson (o as offset) and schema.oindex (so it doesnt collide with a table if it was named schema for somereason)
- [x] modify the select statement file handler to be more broad instead of current handle of the id=number only 
- [x] where clause was over engineered but it wont harm so we can for now handle (id {=, <>, >, <, >=, <=} number)
- [x] clean the database corruption for half read or half write using the index file which should point to the last completely correct row, other than that it should be deleted
- [x] fix the current logger to have context and override the logger with direct methods that takes context and message
- [x] refactor the current parser into two separate DML and DDL parser logic, with an orchestrator handling them
- [ ] versioning system for rows, it takes id and find the exact row and return it with looping through reading the prev versions and return that into a list
- [ ] fix the loggers structure of the dml and ddl so the logger will log a json instead of text for easier parsing
## ADD
- [x] add to the current rows a prevVersionSize after the prevVersion pointer so we can read the data history
- [x] new data type "timestamp" it should be validated but use string for it
- [x] validate already existing types and constraints to create db integrety
- [x] handle update statement filehandler and delete statement
- [x] autoincrment keys "SERIAL" types are auto added not provided by user -> each schema obj tracks its own table ids? or using the index file size?
- [x] create the history logic to control the schema version used
- [x] finish README.md and openapi docs
- [ ] order by logic
- [ ] add logs and error handling
## EXTRA & BONUS
- [ ] order by in select statement
- [ ] Alter statement
- [ ] DDL/DML inversion version control
- [ ] transaction like behavior for grouped queries

---
## REFACTORING
- separation of concerns
most of the current modules have good separation, only file handler is a god class
what it currently do
- opens and saves file handlers on memory
- control the logic of update, delete, select, and create, insert
- read and write to the files
- uses the tablehandler to convert buffers to object and vise versa

how to break down
- leave the file descriptor handling here, it should still be dealing with the save and updates
- instead the StorageStrategy will deal with the actual logic and returns to the file handler what to write and where?
