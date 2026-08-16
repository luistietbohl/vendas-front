import { apenasDigitos, cpfValido, formatarCpf } from './cpf';

describe('cpf utils', () => {
  it('aceita um CPF valido com pontuacao', () => {
    expect(cpfValido('111.444.777-35')).toBe(true);
  });

  it('aceita um CPF valido so com digitos', () => {
    expect(cpfValido('11144477735')).toBe(true);
  });

  it('rejeita um CPF com digito verificador errado', () => {
    expect(cpfValido('111.444.777-36')).toBe(false);
  });

  it('rejeita sequencias repetidas', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com tamanho errado', () => {
    expect(cpfValido('123.456.789')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(cpfValido('')).toBe(false);
  });

  it('formata digitos conforme digitado', () => {
    expect(formatarCpf('111')).toBe('111');
    expect(formatarCpf('111444777')).toBe('111.444.777');
    expect(formatarCpf('11144477735')).toBe('111.444.777-35');
  });

  it('extrai somente digitos', () => {
    expect(apenasDigitos('111.444.777-35')).toBe('11144477735');
  });
});
