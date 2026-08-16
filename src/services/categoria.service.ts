import http from "../http-common";
import CategoriaDTO from "../types/categoria.type";

class CategoriaService {

  create(data: CategoriaDTO) {
    return http.post<CategoriaDTO>("/categoria", data);
  }

  get(id: string) {
    return http.get<CategoriaDTO>(`/categoria/${id}`);
  }

  getAll() {
    return http.get<Array<CategoriaDTO>>("/categoria/all");
  }

  edit(id: string, data: CategoriaDTO) {
    return http.put<CategoriaDTO>(`/categoria/${id}`, data);
  }
  delete(id: string) {
    return http.delete<any>(`/categoria/${id}`);
  }

  aplicarNcmPadrao(categoria: string, ncm: string) {
    return http.post<number>("/produto/aplicar-ncm-padrao", { categoria, ncm });
  }

}

export default new CategoriaService();