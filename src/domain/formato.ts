/** RN-01: arredondamento apenas na exibição, sempre em pt-BR. */
const umaCasa = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const ateUmaCasa = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const formatarKcal = (valor: number): string => umaCasa.format(valor);
export const formatarGramas = (valor: number): string => inteiro.format(valor);
/** Gramas digitadas pela pessoa ("62,5 g"), sem perder a casa decimal. */
export const formatarGramasInformadas = (valor: number): string => ateUmaCasa.format(valor);
export const formatarDecimal = (valor: number): string => umaCasa.format(valor);
