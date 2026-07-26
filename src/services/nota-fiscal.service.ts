import http from "../http-common";
import NotaFiscalDTO from "../types/nota-fiscal.type";

class NotaFiscalService {

  buscar(vendaId: string) {
    return http.get<NotaFiscalDTO>(`/notas-fiscais/${vendaId}`);
  }

  emitir(vendaId: string) {
    return http.post<NotaFiscalDTO>(`/notas-fiscais/${vendaId}/emitir`);
  }

  status(vendaId: string) {
    return http.get<NotaFiscalDTO>(`/notas-fiscais/${vendaId}/status`);
  }

  cancelar(vendaId: string, justificativa: string) {
    return http.post<NotaFiscalDTO>(`/notas-fiscais/${vendaId}/cancelar`, { justificativa });
  }

}

export default new NotaFiscalService();
