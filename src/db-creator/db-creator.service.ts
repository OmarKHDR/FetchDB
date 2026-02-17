import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs/promises';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { PathLike } from 'fs';
import { Schame } from 'src/shared/types/db.schema.types';
//creating something would return 1 if it was already existing and 0 if it was created "to be convinient at future"
@Injectable()
export class DbCreatorService {
  private readonly rootDir: string = path.join(process.cwd(), 'data');
  constructor(private winston: WinstonLoggerService) {
    this.setupDataDirectory(this.rootDir).catch((err) => {
      this.winston.logger.error(`error creating DB directory: ${err}`);
    });
  }

  async setupDataDirectory(root: string) {
    try {
      await fs.mkdir(root);
    } catch (err) {
      if (err.code === 'EEXIST') {
        this.winston.logger.info(`db was already setup at ${root}`);
        return;
      } else throw err;
    }
    this.winston.logger.info(`DB directory was created at: ${root}`);
  }

  async createUser(username: string) {
    if (!this.rootDir) {
      this.winston.logger.error(
        'trying to create a user space without root directory path',
      );
      throw new Error('root directory does not exists');
    }
    if (!username) {
      this.winston.logger.error(
        'trying to create user space on root data directory',
      );
      throw new Error('can not write to the data root directory');
    }
    const userDir = path.join(this.rootDir, username);
    try {
      await fs.mkdir(userDir);
    } catch (err) {
      if (err.code === 'EEXIST') {
        this.winston.logger.info(`user space was already setup at ${username}`);
        return 1;
      } else throw err;
    }
    this.winston.logger.info(`DB directory was created at: ${userDir}`);
    return 0;
  }

  async createDB(username: string, dbname: string) {
    if (!this.rootDir) {
      this.winston.logger.error(
        'trying to create db without root directory path',
      );
      throw new Error('root directory does not exists');
    }
    if (!dbname && !username) {
      this.winston.logger.error('trying to create db inside user space');
      throw new Error('can not write to the root directory of the user space');
    }
    const dbDir = path.join(path.join(this.rootDir, username), dbname);
    try {
      await fs.mkdir(dbDir);
    } catch (err) {
      if (err.code === 'EEXIST') {
        this.winston.logger.info(`user space was already setup at ${username}`);
        try {
          await fs.access(path.join(dbDir, 'schema.json'));
        } catch (err) {
          if (err.code === 'ENOENT')
            return await this.createSchemaFile(dbDir, username, dbname);
        }
        return 1;
      } else throw err;
    }
    this.winston.logger.info(`DB directory was created at: ${dbDir}`);
    await this.createSchemaFile(dbDir, username, dbname);
    return 0;
  }

  async createSchemaFile(dbpath: string, owner: string, dbname: string) {
    const schema: Schame = {
      OWNER_NAME: owner,
      DB_NAME: dbname,
      TABLES: [],
    };
    await fs.writeFile(
      path.join(dbpath, 'schema.json'),
      JSON.stringify(schema),
    );
    return 0;
  }
}
