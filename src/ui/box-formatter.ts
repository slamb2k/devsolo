import boxen from 'boxen';

export class BoxFormatter {
  printBox(title: string, content: string, options?: BoxOptions): void {
    const defaultOptions = {
      padding: 1,
      borderStyle: 'round' as const,
      borderColor: 'cyan' as const,
      title,
      titleAlignment: 'center' as const,
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const box = boxen(content, mergedOptions);
    console.log(box);
  }

  formatBox(title: string, content: string, options?: BoxOptions): string {
    const defaultOptions = {
      padding: 1,
      borderStyle: 'round' as const,
      borderColor: 'cyan' as const,
      title,
      titleAlignment: 'center' as const,
    };

    const mergedOptions = { ...defaultOptions, ...options };
    return boxen(content, mergedOptions);
  }

  printWarning(message: string): void {
    this.printBox('⚠️ Warning', message, {
      borderColor: 'yellow',
      borderStyle: 'double',
    });
  }

  printError(message: string): void {
    this.printBox('❌ Error', message, {
      borderColor: 'red',
      borderStyle: 'double',
    });
  }

  printSuccess(message: string): void {
    this.printBox('✅ Success', message, {
      borderColor: 'green',
      borderStyle: 'double',
    });
  }

  printInfo(message: string): void {
    this.printBox('ℹ️ Info', message, {
      borderColor: 'blue',
      borderStyle: 'single',
    });
  }
}

interface BoxOptions {
  padding?: number;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  borderColor?: string;
  titleAlignment?: 'left' | 'center' | 'right';
}