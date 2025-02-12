import Box from "../Box";
import Flex from "../Flex";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/client";
import gql from "graphql-tag";
import Spinner from "../Spinner";
import Tokenholders from "../Tokenholders";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect } from "react";
import { usePageVisibility } from "../../hooks";

const GET_DATA = gql`
  query($account: ID!, $first: Int!, $skip: Int!) {
    transcoder(id: $account) {
      id
      rewardCut
      feeShare
      totalStake
      active
      delegators(
        first: $first
        skip: $skip
        orderBy: bondedAmount
        orderDirection: desc
      ) {
        pendingStake
        bondedAmount
        id
      }
    }
    protocol {
      totalSupply
      totalActiveStake
    }
    currentRound: rounds(first: 1, orderBy: timestamp, orderDirection: desc) {
      id
    }
  }
`;

const Index = () => {
  const router = useRouter();
  const isVisible = usePageVisibility();
  const query = router.query;
  const account = query.account as string;
  const pollInterval = 20000;
  const { data, loading, fetchMore, startPolling, stopPolling } = useQuery(
    GET_DATA,
    {
      variables: {
        account: account.toLowerCase(),
        address: account.toLowerCase(),
        first: 10,
        skip: 0,
      },
      ssr: false,
      pollInterval,
      notifyOnNetworkStatusChange: true,
    }
  );

  useEffect(() => {
    if (!isVisible) {
      stopPolling();
    } else {
      startPolling(pollInterval);
    }
  }, [isVisible, stopPolling, startPolling]);

  if (loading && !data) {
    return (
      <Flex
        css={{
          pt: "$5",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spinner />
      </Flex>
    );
  }

  return (
    <InfiniteScroll
      css={{ overflow: "hidden !important" }}
      scrollThreshold={0.8}
      dataLength={data && data.transcoder.delegators.length}
      next={() => {
        stopPolling();
        if (!loading && data.transcoder.delegators.length >= 10) {
          fetchMore({
            variables: {
              skip: data.transcoder.delegators.length,
            },
            updateQuery: (previousResult: any, { fetchMoreResult }: any) => {
              if (!fetchMoreResult) {
                return previousResult;
              }
              return {
                ...previousResult,
                // Append the new posts results to the old one
                transcoder: {
                  ...previousResult.transcoder,
                  delegators: [
                    ...previousResult.transcoder.delegators,
                    ...fetchMoreResult.transcoder.delegators,
                  ],
                },
              };
            },
          });
        }
      }}
      hasMore={true}
    >
      <Box css={{ pt: "$5", position: "relative", pb: 6 }}>
        <Tokenholders
          protocol={data.protocol}
          delegators={data.transcoder.delegators}
        />

        {loading && (
          <Flex
            css={{
              position: "absolute",
              transform: "translateX(-50%)",
              left: "50%",
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Spinner />
          </Flex>
        )}
      </Box>
    </InfiniteScroll>
  );
};

export default Index;
