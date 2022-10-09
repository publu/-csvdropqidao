import { useSafeAppsSDK } from "@gnosis.pm/safe-apps-react-sdk";
import { BaseTransaction } from "@gnosis.pm/safe-apps-sdk";
import {
  Breadcrumb,
  BreadcrumbElement,
  Button,
  Card,
  Checkbox,
  Divider,
  Loader,
  Text,
  TextFieldInput,
} from "@gnosis.pm/safe-react-components";
import { TableCell, TableHead, TableRow } from "@material-ui/core";
import { setUseWhatChange } from "@simbathesailor/use-what-changed";
import { BigNumber } from "ethers";
import React, { useCallback, useState, useContext, useEffect } from "react";
import styled from "styled-components";

import { CSVForm } from "./components/CSVForm";
import { Header } from "./components/Header";
import { Summary } from "./components/Summary";
import { MessageContext } from "./contexts/MessageContextProvider";
import { useBalances } from "./hooks/balances";
import { useTokenList } from "./hooks/token";
import { AssetTransfer, CollectibleTransfer, Transfer } from "./parser/csvParser";
import { buildAssetTransfers, buildCollectibleTransfers } from "./transfers/transfers";
import { chunkArray, chunkArrayDecrementingChunkSize, shortenAddress } from "./utils";

setUseWhatChange(process.env.NODE_ENV === "development");

const App: React.FC = () => {
  const { isLoading } = useTokenList();
  const balanceLoader = useBalances();
  const [tokenTransfers, setTokenTransfers] = useState<Transfer[]>([]);
  const { messages } = useContext(MessageContext);
  const [submittedChunks, setSubmittedChunks] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const { sdk } = useSafeAppsSDK();
  const [chunkSizeDecrementing, setChunkSizeDecrementing] = useState(true);
  const [max, setMax] = useState(true);
  const [maxChunk, setMaxChunk] = useState(400);

  const chunkingFunctionParameters: [any[], number] = [
    tokenTransfers.filter(
      (transfer) => transfer.token_type === "erc20" || transfer.token_type === "native",
    ) as AssetTransfer[],
    maxChunk,
  ];

  const assetTransfers = chunkSizeDecrementing
    ? chunkArrayDecrementingChunkSize(...chunkingFunctionParameters)
    : chunkArray(...chunkingFunctionParameters);

  const totalAirdrop = assetTransfers
    .reduce(
      (prev, curr, i) =>
        prev + Number(assetTransfers[i].reduce((prev, curr, j) => prev + Number(assetTransfers[i][j].amount), 0)),
      0,
    )
    .toString();

  const collectibleTransfers = tokenTransfers.filter(
    (transfer) => transfer.token_type === "erc1155" || transfer.token_type === "erc721",
  ) as CollectibleTransfer[];

  const submitTx = useCallback(
    async (i) => {
      setSubmitting(true);
      try {
        const txs: BaseTransaction[] = [];
        txs.push(...buildAssetTransfers(assetTransfers[i]));
        txs.push(...buildCollectibleTransfers(collectibleTransfers));

        console.log(`Encoded ${txs.length} transfers.`);
        const sendTxResponse = await sdk.txs.send({ txs });
        const safeTx = await sdk.txs.getBySafeTxHash(sendTxResponse.safeTxHash);
        setSubmittedChunks([...submittedChunks, i]);
        console.log({ safeTx });
      } catch (e) {
        console.error(e);
      }
      setSubmitting(false);
    },
    [assetTransfers, collectibleTransfers, sdk.txs],
  );

  useEffect(() => {
    setSubmittedChunks([]);
  }, [tokenTransfers]);

  return (
    <Container>
      <Header />
      {
        <>
          {isLoading || balanceLoader.isLoading ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  paddingTop: "36px",
                }}
              >
                <Text size={"xl"} strong>
                  Loading tokenlist and balances...
                </Text>
                <Loader size={"md"} />
              </div>
            </>
          ) : (
            <Card className="cardWithCustomShadow">
              <Breadcrumb>
                <BreadcrumbElement text="CSV Transfer File" iconType="paste" />
              </Breadcrumb>
              <CSVForm updateTransferTable={setTokenTransfers} setParsing={setParsing} />
              <Divider />
              <Breadcrumb>
                <BreadcrumbElement text="Summary" iconType="transactionsInactive" />
                <BreadcrumbElement text="Transfers" color="placeHolder" />
              </Breadcrumb>
              <Checkbox
                label={"Decrement chunk size"}
                checked={chunkSizeDecrementing}
                name={"chunk-size-decrementing"}
                onChange={() => setChunkSizeDecrementing(!chunkSizeDecrementing)}
              />
              <Checkbox
                label={"400 chunk size"}
                checked={max}
                name={"chunk-size-change"}
                onChange={() => {
                  let chunk = 200;
                  if (maxChunk == 200) {
                    chunk = 400;
                  }
                  setMaxChunk(chunk);
                  setMax(!max);
                }}
              />
              {assetTransfers.length > 0 && (
                <>
                  <Text size={"xl"}>Total {totalAirdrop}</Text>
                  <TableHead>
                    <TableCell>#</TableCell>
                    <TableCell>N transfers</TableCell>
                    <TableCell>First Address</TableCell>
                    <TableCell>Last Address</TableCell>
                  </TableHead>
                  {assetTransfers.map((transferContent, i) => (
                    <TableRow key={"asset-transfer-map-" + i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{transferContent.length} transfers</TableCell>
                      <TableCell>{shortenAddress(transferContent[0].receiver)}</TableCell>
                      <TableCell>{shortenAddress(transferContent[transferContent.length - 1].receiver)}</TableCell>
                      <Button disabled={submittedChunks.includes(i)} size={"lg"} onClick={() => submitTx(i)}>
                        Submit
                      </Button>
                    </TableRow>
                  ))}
                </>
              )}
              {/*               <Summary assetTransfers={assetTransfers} collectibleTransfers={collectibleTransfers} /> */}
              {/*               {submitting ? (
                <>
                  <Loader size="md" />
                  <br />
                  <Button size="lg" color="secondary" onClick={() => setSubmitting(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  style={{ alignSelf: "flex-start", marginTop: 16, marginBottom: 16 }}
                  size="lg"
                  color={messages.length === 0 ? "primary" : "error"}
                  onClick={submitTx}
                  disabled={parsing || tokenTransfers.length + collectibleTransfers.length === 0}
                >
                  {parsing ? (
                    <Loader size="sm" color="primaryLight" />
                  ) : messages.length === 0 ? (
                    "Submit"
                  ) : (
                    "Submit with errors"
                  )}
                </Button>
              )} */}
            </Card>
          )}
        </>
      }
    </Container>
  );
};

const Container = styled.div`
  margin-left: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: left;
  width: 100%;
`;

export default App;
