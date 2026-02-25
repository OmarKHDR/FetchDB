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

## MODIFICATIONS:
- currently the schema storage is not allowing versioning, while hanling logic with respect to in memory schema object makes it flexible to versioning, I was overwriting the schema.json
	- i thought about using ndjson, but if i know the exact version why not use that to execute same table indexing logic?
	- changing the scheme read and update to create two files schema.ojson (o as offset) and schema.oindex (so it doesnt collide with a table if it was named schema for somereason)
- modify the select statement file handler to be more broad instead of current handle of the id=number only 
- where clause was over engineered but it wont harm so we can for now handle (id {=, <>, >, <, >=, <=} number)

## ADD
- new data type "timestamp" it should be validated but use string for it
- handle update statement filehandler and delete statement
- create the history logic to control the schema version used
