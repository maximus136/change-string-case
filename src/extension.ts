'use strict';
/* tslint:disable */
import * as vscode from 'vscode';
/* tslint:enable */

export function activate(context: vscode.ExtensionContext) {
  const caseConversionSet = [
    'Camel',
    'Lower',
    'LowerKebab',
    'LowerSnake',
    'Pascal',
    'Sentence',
    'Upper',
    'UpperKebab',
    'UpperSnake',
    'Title'
  ];
  const disposable = () => {
    // return an array of command-registrations using the array element-names.
    return caseConversionSet.map(type =>
      vscode.commands.registerCommand(`extension.change${type}Case`, () => {
        const caseChanger = new CaseChanger();
        caseChanger.changeStringCase(type.toLowerCase());
      })
    );
  };

  context.subscriptions.push(...disposable());
}

class CaseChanger {
  private textEditor = vscode.window.activeTextEditor;
  private errorMsg = `Need separators(-/_/ ) for conversion! 🙁`;

  public changeStringCase(toCase: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // No open text editor found.
    }

    const selections = this.getSelections();
    if (!this.textEditor || !selections || selections.length === 0) {
      return;
    }

    this.textEditor.edit(builder => {
      for (const selection of selections) {
        if (!this.textEditor) {
          break;
        }

        const stringSelection = this.textEditor.document.getText(selection);
        builder.replace(selection, this.getNewString(stringSelection, toCase));
      }
    });
  }

  private getNewString(str: string, toCase: string): string {
    try {
      switch (toCase) {
        case 'upper':
          return str.replace(/[-_]/g, ' ').toUpperCase();
        case 'lower':
          return str.replace(/[-_]/g, ' ').toLowerCase();
        case 'lowerkebab':
          return this.getKebabOrSnakeCase(str, true, true);
        case 'upperkebab':
          return this.getKebabOrSnakeCase(str, true, false);
        case 'lowersnake':
          return this.getKebabOrSnakeCase(str, false, true);
        case 'uppersnake':
          return this.getKebabOrSnakeCase(str, false, false);
        case 'camel':
          return this.getCamelCase(str, true);
        case 'pascal':
          return this.getCamelCase(str, false);
        case 'sentence':
          // Pass in the false parameter to toggle the title case off
          return this.getSentenceCase(str, false);
        case 'title':
          // Pass in the true parameter to toggle to title case on
          return this.getSentenceCase(str, true);
        default:
          throw new Error('Case-conversion not supported! 🙁');
      }
    } catch (err) {
      vscode.window.showInformationMessage(`Err: ${err}`);
      return str;
    }
  }

  private getSelections(): vscode.Selection[] {
    return this.textEditor ? this.textEditor.selections : [];
  }

  private getKebabOrSnakeCase(
    str: string,
    isKebab = true,
    isLower = true
  ): string {
    const suffix = isKebab ? '-' : '_';
    const charToReplace = isKebab ? '_' : '-'; // for kebab-case, replace _'s and vice-versa.
    const regexForReplace = new RegExp(`[${charToReplace}/\]`, 'g');
    const regexToAvoidMultipleChars = new RegExp(
      `[${suffix}](?=[${suffix}])`,
      'g'
    );
    let newStr = this.getDesiredFormatFromCamelCase(str, suffix);

    if (!this.hasSeparators(newStr)) {
      throw new Error(this.errorMsg);
    }

    newStr = newStr
      .replace(/ /g, '')
      .replace(regexForReplace, suffix)
      .replace(regexToAvoidMultipleChars, '');

    return isLower ? newStr.toLowerCase() : newStr.toUpperCase();
  }

  // thanks timhobbs/camelCase.js[https://gist.github.com/timhobbs/23c891bfea312cf43f31395d2d6660b1]
  private getCamelCase(str: string, isCamel = true): string {
    if (!this.hasSeparators(str)) {
      throw new Error(this.errorMsg);
    }
    let newStr = this.getDesiredFormatFromCamelCase(str, ' ');
    newStr = newStr
      .toLowerCase()
      .replace(/(?:(^.)|([-_ \s]+.))/g, match =>
        match.charAt(match.length - 1).toUpperCase()
      );

    // return camelCased or PascalCased output based on the isCamel option.
    const firstCharacter = isCamel
      ? newStr.charAt(0).toLowerCase()
      : newStr.charAt(0).toUpperCase();
    return firstCharacter + newStr.slice(1);
  }

  private getSentenceCase(str: string, isTitleCase: boolean = false): string {
    let newStr = ''; 
    newStr = this.getDesiredFormatFromCamelCase(str, ' ');
    // Split the string into consecutive words if camel or pascal cased  
    // now replace -'s and _'s that are NOT followed by a space with a space first, then remove the pending ones
    // Split the string into its parts to convert to Sentence Case
    let newStrArr = newStr.replace(/[-|_](?=[^ ])/g, ' ').replace(/-|_/g,'').split(' ');
    
    // If title case, then convert each word to title case
    if(isTitleCase) {
      newStrArr = newStrArr.map(word => this.convertToTitleCase(word));
    }
    else {
      // Convert each of the words to lower case
      newStrArr = newStrArr.map(word => word.toLowerCase());
      // Convert the first word to Title case
      newStrArr[0] = this.convertToTitleCase(newStrArr[0]);
    }
    
    // Join the array and then trim multiple white spaces
    newStr = this.trimMultipleWhiteSpaces(newStrArr.join(' '));
    return newStr;
  }

  private getDesiredFormatFromCamelCase(str: string, suffix: string): string {
    return str.replace(/[^A-Z](?=[A-Z])/g, match => `${match}${suffix}`);
  }

  private hasSeparators(str: string): boolean {
    const separatorRegex = /[-_ ]/g;
    const camelRegex = /[^A-Z](?=[A-Z])/g;

    return separatorRegex.test(str) || camelRegex.test(str);
  }

  // Removes multiple white spaces from within a string
  // trim() removes white spaces from the ends of a string
  private trimMultipleWhiteSpaces(str: string) {
    return str.replace(/\s+/g, ' ').trim();
  }

  // Returns a string with Title case
  private convertToTitleCase(str: string) {
    return str.charAt(0).toUpperCase()+str.slice(1);
  }
}
