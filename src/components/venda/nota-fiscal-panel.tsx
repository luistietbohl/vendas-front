import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, TextField } from "@mui/material";
import NotaFiscalDTO from "../../types/nota-fiscal.type";
import NotaFiscalService from "../../services/nota-fiscal.service";

type Props = {
  vendaUid: string | null;
};

export default function NotaFiscalPanel({ vendaUid }: Props) {
  const [nota, setNota] = useState<NotaFiscalDTO | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [mostrarCancelamento, setMostrarCancelamento] = useState(false);
  const vendaUidRef = useRef(vendaUid);

  useEffect(() => {
    vendaUidRef.current = vendaUid;
    setNota(null);
    setErro(null);
    setMostrarCancelamento(false);
    setJustificativa("");

    if (!vendaUid) {
      return;
    }
    const requestedVendaUid = vendaUid;
    NotaFiscalService.buscar(vendaUid)
      .then((response) => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setNota(response.data);
      })
      .catch(() => {
        // Falha na carga silenciosa em segundo plano: mantém nota como null
        // e deixa o operador acionar "Emitir Nota Fiscal" manualmente.
      });
  }, [vendaUid]);

  function emitir() {
    if (!vendaUid) {
      return;
    }
    const requestedVendaUid = vendaUid;
    setCarregando(true);
    setErro(null);
    NotaFiscalService.emitir(vendaUid)
      .then((response) => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setNota(response.data);
        setCarregando(false);
      })
      .catch(() => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setErro("Não foi possível emitir a nota fiscal. Tente novamente.");
        setCarregando(false);
      });
  }

  function verificarStatus() {
    if (!vendaUid) {
      return;
    }
    const requestedVendaUid = vendaUid;
    setCarregando(true);
    setErro(null);
    NotaFiscalService.status(vendaUid)
      .then((response) => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setNota(response.data);
        setCarregando(false);
      })
      .catch(() => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setErro("Não foi possível consultar o status da nota fiscal.");
        setCarregando(false);
      });
  }

  function cancelar() {
    if (!vendaUid || justificativa.trim().length < 15) {
      setErro("A justificativa precisa ter pelo menos 15 caracteres.");
      return;
    }
    const requestedVendaUid = vendaUid;
    setCarregando(true);
    setErro(null);
    NotaFiscalService.cancelar(vendaUid, justificativa)
      .then((response) => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setNota(response.data);
        setCarregando(false);
        setMostrarCancelamento(false);
      })
      .catch(() => {
        if (vendaUidRef.current !== requestedVendaUid) {
          return;
        }
        setErro("Não foi possível cancelar a nota fiscal.");
        setCarregando(false);
      });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {erro && <Alert severity="error">{erro}</Alert>}

      {(!nota || nota.status === "NAO_EMITIDA" || nota.status === "REJEITADA" || nota.status === "ERRO") && (
        <Button
          variant="contained"
          color="primary"
          disabled={!vendaUid || carregando}
          onClick={emitir}
        >
          Emitir Nota Fiscal
        </Button>
      )}

      {nota && nota.status === "PROCESSANDO" && (
        <Button variant="outlined" color="primary" disabled={carregando} onClick={verificarStatus}>
          Verificar Status
        </Button>
      )}

      {nota && nota.status === "AUTORIZADA" && (
        <>
          <Button
            variant="outlined"
            color="primary"
            component="a"
            href={nota.urlDanfe ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            Ver DANFE
          </Button>
          {!mostrarCancelamento ? (
            <Button variant="outlined" color="error" onClick={() => setMostrarCancelamento(true)}>
              Cancelar Nota
            </Button>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                label="Justificativa do cancelamento"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                helperText="Mínimo de 15 caracteres"
                multiline
              />
              <Button variant="contained" color="error" disabled={carregando} onClick={cancelar}>
                Confirmar Cancelamento
              </Button>
            </Box>
          )}
        </>
      )}

      {nota && nota.status === "CANCELADA" && <Alert severity="info">Nota fiscal cancelada.</Alert>}
    </Box>
  );
}
