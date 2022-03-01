import React, { useCallback, useState } from "react";
import { graphql, RelayPaginationProp } from "react-relay";

import MainLayout from "coral-admin/components/MainLayout";
import { IntersectionProvider } from "coral-framework/lib/intersection";
import {
  useLoadMore,
  withPaginationContainer,
} from "coral-framework/lib/relay";
import {
  BaseButton,
  Button,
  ButtonIcon,
  ClickOutside,
  Dropdown,
  Flex,
  Popover,
} from "coral-ui/components/v2";

import { DashboardContainer_query as QueryData } from "coral-admin/__generated__/DashboardContainer_query.graphql";
import { DashboardContainerPaginationQueryVariables } from "coral-admin/__generated__/DashboardContainerPaginationQuery.graphql";

import SiteDashboardTimestamp from "./components/SiteDashboardTimestamp";
import Dashboard from "./Dashboard";
import DashboardSiteSelector from "./DashboardSiteSelector";

import styles from "./DashboardContainer.css";

interface Site {
  name: string;
  id: string;
}

interface RootPaginationProps {
  query: QueryData | null;
}

interface Props extends RootPaginationProps {
  relay: RelayPaginationProp;
  site?: Site | null;
}
const DashboardContainer: React.FunctionComponent<Props> = (props) => {
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toString());
  const [loadMore, isLoadingMore] = useLoadMore(props.relay, 10);

  const onRefetch = useCallback(() => {
    setLastUpdated(new Date().toString());
  }, []);
  if (!props.site) {
    return null;
  }
  const sites = props.query
    ? props.query.sites.edges.map((edge) => edge.node)
    : [];
  return (
    <MainLayout className={styles.root}>
      <Popover
        id="dashboardSiteSwitcher"
        placement="bottom-end"
        description="A dialog of the user menu with related links and actions"
        body={({ toggleVisibility }) => (
          <ClickOutside onClickOutside={toggleVisibility}>
            <Dropdown>
              <IntersectionProvider>
                <DashboardSiteSelector
                  loading={!props.query}
                  sites={sites}
                  onLoadMore={loadMore}
                  hasMore={props.relay.hasMore()}
                  disableLoadMore={isLoadingMore}
                />
              </IntersectionProvider>
            </Dropdown>
          </ClickOutside>
        )}
      >
        {({ toggleVisibility, ref, visible }) => (
          <BaseButton onClick={toggleVisibility} ref={ref}>
            <Flex>
              <h2 className={styles.header}>{props.site && props.site.name}</h2>
              {
                <ButtonIcon className={styles.icon} size="lg">
                  {visible ? "arrow_drop_up" : "arrow_drop_down"}
                </ButtonIcon>
              }
            </Flex>
          </BaseButton>
        )}
      </Popover>
      <Flex alignItems="center" spacing={2}>
        <SiteDashboardTimestamp />
        <Button variant="text" onClick={onRefetch} iconLeft>
          <ButtonIcon>refresh</ButtonIcon>
          Refresh
        </Button>
      </Flex>
      <Dashboard siteID={props.site.id} lastUpdated={lastUpdated} />
    </MainLayout>
  );
};

type FragmentVariables = DashboardContainerPaginationQueryVariables;

const enhanced = withPaginationContainer<
  RootPaginationProps,
  DashboardContainerPaginationQueryVariables,
  FragmentVariables
>(
  {
    query: graphql`
      fragment DashboardContainer_query on Query
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 20 }
          cursor: { type: "Cursor" }
        ) {
        sites(first: $count, after: $cursor)
          @connection(key: "SitesConfig_sites") {
          edges {
            node {
              id
              name
              ...DashboardSiteContainer_site
            }
          }
        }
      }
    `,
  },
  {
    getConnectionFromProps(props) {
      return props.query && props.query.sites;
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        count,
        cursor,
      };
    },
    query: graphql`
      # Pagination query to be fetched upon calling 'loadMore'.
      # Notice that we re-use our fragment, and the shape of this query matches our fragment spec.
      query DashboardContainerPaginationQuery($count: Int!, $cursor: Cursor) {
        ...DashboardContainer_query @arguments(count: $count, cursor: $cursor)
      }
    `,
  }
)(DashboardContainer);
export default enhanced;
