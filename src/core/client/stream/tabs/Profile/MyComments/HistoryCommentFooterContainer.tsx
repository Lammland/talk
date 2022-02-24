import { Localized } from "@fluent/react/compat";
import cn from "classnames";
import { compact } from "lodash";
import React, { FunctionComponent } from "react";
import { graphql, RelayPaginationProp } from "react-relay";

import { getURLWithCommentID } from "coral-framework/helpers";
import { useToggleState } from "coral-framework/hooks";
import {
  useLoadMore,
  withPaginationContainer,
} from "coral-framework/lib/relay";
import CLASSES from "coral-stream/classes";
import { BaseButton, ButtonIcon, Flex, Icon } from "coral-ui/components/v2";

import { HistoryCommentFooterContainer_comment$data as HistoryCommentFooterContainer_comment } from "coral-stream/__generated__/HistoryCommentFooterContainer_comment.graphql";
import { HistoryCommentFooterContainer_settings$data as HistoryCommentFooterContainer_settings } from "coral-stream/__generated__/HistoryCommentFooterContainer_settings.graphql";
import { HistoryCommentFooterContainerPaginationQuery } from "coral-stream/__generated__/HistoryCommentFooterContainerPaginationQuery.graphql";

import styles from "./HistoryCommentFooterContainer.css";

interface Props {
  comment: HistoryCommentFooterContainer_comment;
  settings: HistoryCommentFooterContainer_settings;
  relay: RelayPaginationProp;
  onGotoConversation: (e: React.MouseEvent) => void;
}

const HistoryCommentFooterContainer: FunctionComponent<Props> = ({
  comment,
  settings,
  relay,
  onGotoConversation,
}) => {
  const [showDetails, , toggleDetailVisibility] = useToggleState();
  const [loadMore] = useLoadMore(relay, 2);

  const hasReactions = comment.actionCounts.reaction.total > 0;
  const hasReplies = comment.replyCount > 0;

  return (
    <>
      <Flex spacing={2}>
        {hasReactions && (
          <BaseButton
            onClick={toggleDetailVisibility}
            className={cn(
              styles.button,
              styles.reactionsButton,
              {
                [styles.activeReactionsButton]: showDetails,
              },
              CLASSES.myComment.reactions
            )}
          >
            <ButtonIcon>{settings.reaction.icon}</ButtonIcon>
            <span className={cn(styles.reactionsButtonText)}>
              {settings.reaction.label} {comment.actionCounts.reaction.total}
            </span>

            <ButtonIcon className={styles.buttonCaret}>
              {showDetails ? "expand_less" : "expand_more"}
            </ButtonIcon>
          </BaseButton>
        )}
        {hasReplies && (
          <div className={cn(styles.replies, CLASSES.myComment.replies)}>
            <Icon className={styles.repliesIcon}>reply</Icon>
            <Localized
              id="profile-historyComment-replies"
              $replyCount={comment.replyCount}
            >
              <span>Replies {comment.replyCount}</span>
            </Localized>
          </div>
        )}
        <BaseButton
          anchor
          target="_parent"
          href={getURLWithCommentID(comment.story.url, comment.id)}
          onClick={onGotoConversation}
          className={cn(
            styles.button,
            styles.viewConversation,
            CLASSES.myComment.viewConversationButton
          )}
        >
          <Icon className={styles.viewConversationIcon} size="sm">
            open_in_new
          </Icon>
          <Localized id="profile-historyComment-viewConversation">
            <span className={styles.viewConversationText}>
              View Conversation
            </span>
          </Localized>
        </BaseButton>
      </Flex>
      {showDetails && (
        <Flex className={styles.reacterUsernames} alignItems="flex-start">
          <Icon size="sm" className={styles.reacterUsernamesIcon}>
            {settings.reaction.icon}
          </Icon>
          <Flex spacing={1}>
            <span>
              {compact(
                comment.reactions.edges.map(
                  ({ node: { reacter } }) => reacter?.username
                )
              ).join(", ")}
            </span>
            {relay.hasMore() && (
              <BaseButton
                className={styles.loadMoreReactions}
                onClick={loadMore}
              >
                Load more
              </BaseButton>
            )}
          </Flex>
        </Flex>
      )}
    </>
  );
};

// TODO: (cvle) if this could be autogenerated..
type FragmentVariables = HistoryCommentFooterContainerPaginationQuery;

const enhanced = withPaginationContainer<
  Props,
  HistoryCommentFooterContainerPaginationQuery,
  FragmentVariables
>(
  {
    comment: graphql`
      fragment HistoryCommentFooterContainer_comment on Comment
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 20 }
          cursor: { type: "Cursor" }
        ) {
        id
        reactions(first: $count, after: $cursor)
          @connection(key: "HistoryCommentFooter_reactions") {
          edges {
            node {
              id
              reacter {
                username
              }
            }
          }
        }
        story {
          id
          url
          metadata {
            title
          }
        }
        replyCount
        actionCounts {
          reaction {
            total
          }
        }
      }
    `,
    settings: graphql`
      fragment HistoryCommentFooterContainer_settings on Settings {
        reaction {
          label
          icon
        }
      }
    `,
  },
  {
    getConnectionFromProps(props) {
      return props.comment && props.comment.reactions;
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        ...fragmentVariables,
        count,
        cursor,
        commentID: props.comment.id,
      };
    },
    query: graphql`
      # Pagination query to be fetched upon calling 'loadMore'.
      # Notice that we re-use our fragment, and the shape of this query matches our fragment spec.
      query HistoryCommentFooterContainerPaginationQuery(
        $count: Int!
        $cursor: Cursor
        $commentID: ID!
      ) {
        comment(id: $commentID) {
          ...HistoryCommentFooterContainer_comment
            @arguments(count: $count, cursor: $cursor)
        }
      }
    `,
  }
)(HistoryCommentFooterContainer);

export default enhanced;
