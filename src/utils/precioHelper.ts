import { ItemLista, Supermercado } from '../types/producto';
import { Config } from '../constants/config';

// Formato de precio en pesos chilenos
export function formatearPrecio(precio: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(precio);
}

// Recomendar supermercado según precio total y distancia
export function recomendarSupermercado(
  lista: ItemLista[],
  supermercados: Supermercado[]
): Supermercado | null {
  if (supermercados.length === 0) return null;

  // Ordenar por total estimado
  const ordenados = [...supermercados].sort(
    (a, b) => (a.totalEstimado ?? 0) - (b.totalEstimado ?? 0)
  );

  const masBarato = ordenados[0];
  const masCercano = [...supermercados].sort(
    (a, b) => (a.distancia ?? 999) - (b.distancia ?? 999)
  )[0];

  // Si la diferencia es menor al umbral, recomendar el más cercano
  const diferencia =
    (masCercano.totalEstimado ?? 0) - (masBarato.totalEstimado ?? 0);

  if (diferencia < Config.umbralDiferenciaPrecio) {
    return masCercano;
  }
  return masBarato;
}
