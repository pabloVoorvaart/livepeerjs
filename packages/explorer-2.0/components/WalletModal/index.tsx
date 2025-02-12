import { AbstractConnector } from "@web3-react/abstract-connector";
import { useState, useEffect } from "react";
import CloseIcon from "../../public/img/close.svg";
import MetaMaskIcon from "../../public/img/metamask.svg";
import { Dialog } from "@reach/dialog";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { SUPPORTED_WALLETS } from "../../lib/constants";
import { Injected } from "../../lib/connectors";
import { isMobile } from "react-device-detect";
import { useWeb3React } from "@web3-react/core";
import Option from "./Option";
import PendingView from "./PendingView";
import AccountDetails from "./AccountDetails";
import gql from "graphql-tag";
import { useQuery, useApolloClient } from "@apollo/client";
import { usePrevious } from "../../hooks";
import ReactGA from "react-ga";
import Box from "../Box";
import Flex from "../Flex";

const WALLET_VIEWS = {
  OPTIONS: "options",
  ACCOUNT: "account",
  PENDING: "pending",
};

const Index = () => {
  const { active, account, connector, error, activate } = useWeb3React();
  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT);
  const [pendingWallet, setPendingWallet] = useState<
    AbstractConnector | undefined
  >();
  const client = useApolloClient();

  const tryActivation = (_connector: AbstractConnector | undefined) => {
    let name = "";
    Object.keys(SUPPORTED_WALLETS).map((key) => {
      if (_connector === SUPPORTED_WALLETS[key].connector) {
        return (name = SUPPORTED_WALLETS[key].name);
      }
      return true;
    });
    // log selected wallet
    ReactGA.event({
      category: "Wallet",
      action: "Change Wallet",
      label: name,
    });

    setPendingWallet(_connector); // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING);
    // if the connector is walletconnect and the user has already tried to connect, manually reset the connector
    if (
      _connector instanceof WalletConnectConnector &&
      _connector.walletConnectProvider?.wc?.uri
    ) {
      _connector.walletConnectProvider = undefined;
    }

    activate(_connector, undefined, true);
  };

  const GET_WALLET_MODAL_STATUS = gql`
    {
      walletModalOpen @client
    }
  `;
  const { data, loading } = useQuery(GET_WALLET_MODAL_STATUS);
  const activePrevious = usePrevious(active);
  const connectorPrevious = usePrevious(connector);

  useEffect(() => {
    if (
      data.walletModalOpen &&
      ((active && !activePrevious) ||
        (connector && connector !== connectorPrevious && !error))
    ) {
      setWalletView(WALLET_VIEWS.ACCOUNT);
    }
  }, [
    setWalletView,
    active,
    error,
    connector,
    data,
    activePrevious,
    connectorPrevious,
  ]);

  useEffect(() => {
    if (active) {
      setWalletView(WALLET_VIEWS.ACCOUNT);
    }
  }, [setWalletView, active]);

  if (loading) {
    return null;
  }

  const close = () => {
    client.writeQuery({
      query: gql`
        query {
          walletModalOpen
        }
      `,
      data: {
        walletModalOpen: false,
      },
    });
  };

  function getOptions() {
    const isMetamask = window["ethereum"] && window["ethereum"].isMetaMask;
    return Object.keys(SUPPORTED_WALLETS).map((key) => {
      const option = SUPPORTED_WALLETS[key];

      // check for mobile options
      if (isMobile) {
        if (!window["web3"] && !window["ethereum"] && option.mobile) {
          return (
            <Option
              onClick={() => {
                option.connector !== connector &&
                  !option.href &&
                  tryActivation(option.connector);
              }}
              key={key}
              active={option.connector && option.connector === connector}
              color={option.color}
              link={option.href}
              header={option.name}
              subheader={null}
              Icon={option.icon}
            />
          );
        }
        return null;
      }

      // overwrite injected when needed
      if (option.connector === Injected) {
        // don't show injected if there's no injected provider
        if (!(window["web3"] || window["ethereum"])) {
          if (option.name === "MetaMask") {
            return (
              <Option
                key={key}
                color={"#E8831D"}
                header={"Install Metamask"}
                subheader={null}
                link={"https://metamask.io/"}
                Icon={MetaMaskIcon}
              />
            );
          } else {
            return null; // dont want to return install twice
          }
        }
        // don't return metamask if injected provider isn't metamask
        else if (option.name === "MetaMask" && !isMetamask) {
          return null;
        }
        // likewise for generic
        else if (option.name === "Injected" && isMetamask) {
          return null;
        }
      }

      // return rest of options
      return (
        !isMobile &&
        !option.mobileOnly && (
          <Option
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector);
            }}
            key={key}
            active={option.connector === connector}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={null} //use option.descriptio to bring back multi-line
            Icon={option.icon}
          />
        )
      );
    });
  }

  function getModalContent() {
    if (account && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          onClose={close}
          openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
        />
      );
    }
    return (
      <Box css={{ borderRadius: "inherit" }}>
        <Flex
          css={{
            alignItems: "center",
            justifyContent: "space-between",
            px: "$4",
            py: 24,
          }}
        >
          <Box css={{ fontWeight: 500 }}>
            {walletView !== WALLET_VIEWS.ACCOUNT ? (
              <Box
                onClick={() => {
                  setWalletView(WALLET_VIEWS.ACCOUNT);
                }}
                css={{ color: "$primary", cursor: "pointer" }}
              >
                Back
              </Box>
            ) : (
              "Connect To A Wallet"
            )}
          </Box>
          <Box
            as={CloseIcon}
            onClick={close}
            css={{
              cursor: "pointer",
              width: 12,
              height: 12,
              color: "white",
            }}
          />
        </Flex>
        <Box
          css={{
            borderBottomLeftRadius: "inherit",
            borderBottomRightRadius: "inherit",
            bg: "rgba(255, 255, 255, .04)",
            p: "$4",
          }}
        >
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView connector={pendingWallet} />
          ) : (
            <Box css={{ display: "grid", gap: "$3", gridColumn: 1 }}>
              {process.browser && getOptions()}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  return (
    data.walletModalOpen && (
      <Dialog aria-label="Choose Wallet" onDismiss={close}>
        <Box className="tour-step-2">{getModalContent()}</Box>
      </Dialog>
    )
  );
};

// Borrowed from uniswap's WalletModal component implementation
export default Index;
