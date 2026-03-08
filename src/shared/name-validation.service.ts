import { Injectable } from "@nestjs/common";
import { reserved_keywords } from "./constants/keywords.constants";
import { Types } from "src/storage-engine/types/column.type";

@Injectable()
export class NameValidationService {
	constructor() {}
	validateName(name: string, type: string = '') {
		if (reserved_keywords.includes(name) || Types.includes(name) || ['default', 'unique', 'not', 'null'].includes(name))
			throw new Error(`Syntax Error: Expected a ${type} but found ${name} instead`)
		if (!name.match(/[a-zA-Z0-9\-_]/))
			throw new Error(`Syntax Error: ${type} ${name} isn't valid`)
	}
}