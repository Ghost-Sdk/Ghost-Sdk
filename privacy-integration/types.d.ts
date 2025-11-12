declare module 'snarkjs' {
  export namespace groth16 {
    export function fullProve(
      input: any,
      wasmFile: string,
      zkeyFile: string
    ): Promise<{ proof: any; publicSignals: string[] }>;

    export function verify(
      vkey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;
  }
}

declare module 'chalk' {
  interface Chalk {
    (text: string): string;
    red(text: string): string;
    green(text: string): string;
    yellow(text: string): string;
    blue(text: string): string;
    magenta(text: string): string;
    cyan(text: string): string;
    white(text: string): string;
    gray(text: string): string;
    grey(text: string): string;
  }
  const chalk: Chalk;
  export = chalk;
}

declare module 'borsh';
