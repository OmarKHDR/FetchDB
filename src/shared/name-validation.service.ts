import { Injectable } from "@nestjs/common";
import { reserved_keywords } from "./constants/keywords.constants";
import { StringManipulationService } from "./string-manipulation.service";

@Injectable()
export class NameValidationService {
	constructor() {}
	validateName(name: string, type: string = '') {
		if (reserved_keywords.includes(name))
			throw new Error(`Syntax Error: Expected a ${type} but found ${name} instead`)
		// is string here checks for starting with quotes
		// if (!this.stringManip.isString(name) && )
		//by design the column name starting with quotes would break the search, it can be fixed but not now
		// that leaves us with only couple of character
		if (!name.match(/[a-zA-Z0-9\-_]/))
			throw new Error(`Syntax Error: ${type} ${name} isn't valid`)
	}
}