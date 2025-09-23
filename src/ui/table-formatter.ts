import Table from 'cli-table3';
import chalk from 'chalk';

export class TableFormatter {
  formatTable(headers: string[], rows: string[][]): string {
    const table = new Table({
      head: headers.map(h => chalk.bold(h)),
      style: {
        head: ['cyan'],
      },
    });

    rows.forEach(row => table.push(row));
    return table.toString();
  }

  printTable(headers: string[], rows: string[][]): void {
    console.log(this.formatTable(headers, rows));
  }

  formatSimpleTable(data: Record<string, any>): string {
    const rows = Object.entries(data).map(([key, value]) => [
      chalk.gray(key),
      String(value),
    ]);

    return this.formatTable(['Property', 'Value'], rows);
  }

  formatComparisonTable(
    title1: string,
    data1: Record<string, any>,
    title2: string,
    data2: Record<string, any>
  ): string {
    const keys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    const rows: string[][] = [];

    for (const key of keys) {
      rows.push([
        chalk.gray(key),
        String(data1[key] || '-'),
        String(data2[key] || '-'),
      ]);
    }

    return this.formatTable(['Property', title1, title2], rows);
  }

  formatProgressTable(items: ProgressItem[]): string {
    const rows = items.map(item => {
      const status = item.completed
        ? chalk.green('✓')
        : item.inProgress
        ? chalk.yellow('⋯')
        : chalk.gray('○');

      const name = item.completed
        ? chalk.gray.strikethrough(item.name)
        : item.inProgress
        ? chalk.yellow(item.name)
        : item.name;

      return [status, name, item.description || ''];
    });

    return this.formatTable(['', 'Task', 'Description'], rows);
  }
}

interface ProgressItem {
  name: string;
  description?: string;
  completed: boolean;
  inProgress: boolean;
}