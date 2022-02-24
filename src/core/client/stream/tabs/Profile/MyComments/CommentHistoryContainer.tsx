import React, { FunctionComponent, useCallback } from "react";
import { graphql, RelayPaginationProp } from "react-relay";

import { useViewerNetworkEvent } from "coral-framework/lib/events";
import {
  useLoadMore,
  useLocal,
  withPaginationContainer,
} from "coral-framework/lib/relay";
import { LoadMoreHistoryCommentsEvent } from "coral-stream/events";

import { CommentHistoryContainer_settings$data as SettingsData } from "coral-stream/__generated__/CommentHistoryContainer_settings.graphql";
import { CommentHistoryContainer_story$data as StoryData } from "coral-stream/__generated__/CommentHistoryContainer_story.graphql";
import { CommentHistoryContainer_viewer$data as ViewerData } from "coral-stream/__generated__/CommentHistoryContainer_viewer.graphql";
import { CommentHistoryContainerLocal } from "coral-stream/__generated__/CommentHistoryContainerLocal.graphql";
import { CommentHistoryContainerPaginationQuery$variables as CommentHistoryContainerPaginationQueryVariables } from "coral-stream/__generated__/CommentHistoryContainerPaginationQuery.graphql";

import CommentHistory from "./CommentHistory";

interface Props {
  viewer: ViewerData;
  story: StoryData;
  settings: SettingsData;
  relay: RelayPaginationProp;
}

export const CommentHistoryContainer: FunctionComponent<Props> = ({
  relay,
  viewer,
  story,
  settings,
}) => {
  const [{ archivingEnabled, autoArchiveOlderThanMs }] = useLocal<
    CommentHistoryContainerLocal
  >(graphql`
    fragment CommentHistoryContainerLocal on Local {
      archivingEnabled
      autoArchiveOlderThanMs
    }
  `);
  const [loadMore, isLoadingMore] = useLoadMore(relay, 10);
  const beginLoadMoreEvent = useViewerNetworkEvent(
    LoadMoreHistoryCommentsEvent
  );
  const loadMoreAndEmit = useCallback(async () => {
    const loadMoreEvent = beginLoadMoreEvent();
    try {
      await loadMore();
      loadMoreEvent.success();
    } catch (error) {
      loadMoreEvent.error({ message: error.message, code: error.code });
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, [loadMore, beginLoadMoreEvent]);
  const comments = viewer.comments.edges.map((edge) => edge.node);
  return (
    <>
      <CommentHistory
        story={story}
        settings={settings}
        comments={comments}
        onLoadMore={loadMoreAndEmit}
        hasMore={relay.hasMore()}
        disableLoadMore={isLoadingMore}
        archivingEnabled={archivingEnabled}
        autoArchiveOlderThanMs={autoArchiveOlderThanMs}
      />
    </>
  );
};

// TODO: (cvle) If this could be autogenerated.
type FragmentVariables = CommentHistoryContainerPaginationQueryVariables;

const enhanced = withPaginationContainer<
  Props,
  CommentHistoryContainerPaginationQueryVariables,
  FragmentVariables
>(
  {
    story: graphql`
      fragment CommentHistoryContainer_story on Story {
        ...HistoryCommentContainer_story
      }
    `,
    settings: graphql`
      fragment CommentHistoryContainer_settings on Settings {
        ...HistoryCommentContainer_settings
      }
    `,
    viewer: graphql`
      fragment CommentHistoryContainer_viewer on User
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 5 }
          cursor: { type: "Cursor" }
        ) {
        comments(first: $count, after: $cursor)
          @connection(key: "CommentHistory_comments") {
          edges {
            node {
              id
              ...HistoryCommentContainer_comment
            }
          }
        }
      }
    `,
  },
  {
    getConnectionFromProps(props) {
      return props.viewer && props.viewer.comments;
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
      query CommentHistoryContainerPaginationQuery(
        $count: Int!
        $cursor: Cursor
      ) {
        viewer {
          ...CommentHistoryContainer_viewer
            @arguments(count: $count, cursor: $cursor)
        }
      }
    `,
  }
)(CommentHistoryContainer);

export default enhanced;
