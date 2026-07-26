export type NotaFiscalStatusType =
  | "NAO_EMITIDA"
  | "PROCESSANDO"
  | "AUTORIZADA"
  | "REJEITADA"
  | "CANCELADA"
  | "ERRO";

export default interface NotaFiscalDTO {
  uid?: string | null;
  vendaUid: string;
  status: NotaFiscalStatusType;
  numero?: string | null;
  serie?: string | null;
  chaveAcesso?: string | null;
  protocoloAutorizacao?: string | null;
  mensagemSefaz?: string | null;
  urlDanfe?: string | null;
  dataEmissao?: string | null;
  dataCancelamento?: string | null;
  justificativaCancelamento?: string | null;
}
