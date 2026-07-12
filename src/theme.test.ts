import { theme } from './theme';

describe('theme', () => {
  it('uses the Bom Cream palette tokens', () => {
    expect(theme.palette.primary.main).toBe('#0E4F82');
    expect(theme.palette.primary.dark).toBe('#0A3A61');
    expect(theme.palette.secondary.main).toBe('#F0A8CE');
    expect(theme.palette.secondary.light).toBe('#F6C2E0');
    expect(theme.palette.background.default).toBe('#FFFBF6');
    expect(theme.palette.background.paper).toBe('#FFFFFF');
  });

  it('sets Nunito as the base font family', () => {
    expect(theme.typography.fontFamily).toContain('Nunito');
  });

  it('moves the md breakpoint to 768px for the mobile shell', () => {
    expect(theme.breakpoints.values.md).toBe(768);
  });

  it('gives buttons a pill shape and no uppercase transform', () => {
    const buttonRoot = (theme.components?.MuiButton?.styleOverrides as any)?.root;
    expect(buttonRoot.textTransform).toBe('none');
    expect(buttonRoot.borderRadius).toBe(999);
  });
});
