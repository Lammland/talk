import { Localized } from "@fluent/react/compat";
import React, { FunctionComponent } from "react";
import { graphql, RelayPaginationProp } from "react-relay";

import {
  useLoadMore,
  withPaginationContainer,
} from "coral-framework/lib/relay";
import {
  Button,
  Counter,
  Flex,
  HorizontalGutter,
} from "coral-ui/components/v2";

import { ConversationModalContainer_comment$data as ConversationModalContainer_comment } from "coral-admin/__generated__/ConversationModalContainer_comment.graphql";
import { ConversationModalContainer_settings$data as ConversationModalContainer_settings } from "coral-admin/__generated__/ConversationModalContainer_settings.graphql";
import { ConversationModalContainerPaginationQueryVariables } from "coral-admin/__generated__/ConversationModalContainerPaginationQuery.graphql";

import { Circle } from "../Timeline";
import ConversationModalComment from "./ConversationModalCommentContainer";

import styles from "./ConversationModalContainer.css";

interface RootPaginationProps {
  comment: ConversationModalContainer_comment;
  settings: ConversationModalContainer_settings;
}

interface Props extends RootPaginationProps {
  relay: RelayPaginationProp;
  onClose: () => void;
  onUsernameClicked: (id?: string) => void;
}

const ConversationModalContainer: FunctionComponent<Props> = ({
  comment,
  relay,
  settings,
  onUsernameClicked,
}) => {
  const [loadMore] = useLoadMore(relay, 5);
  const parents = comment.parents.edges.map((edge) => edge.node);
  return (
    <HorizontalGutter className={styles.root}>
      {comment.parentCount > parents.length && (
        <div>
          <Flex alignItems="center">
            <Circle hollow={true} className={styles.topCircle} />
            <Button underline variant="text" onClick={loadMore}>
              <Localized id="conversation-modal-showMoreParents">
                <span>Show more of this conversation</span>
              </Localized>
              <Counter>{comment.parentCount}</Counter>
            </Button>
          </Flex>
          <Flex
            direction="column"
            alignItems="center"
            className={styles.bottomCircleContainer}
          >
            <Circle color="light" size="small" />
          </Flex>
        </div>
      )}
      {parents.map((parent) => (
        <ConversationModalComment
          key={parent.id}
          isParent={true}
          comment={parent}
          onUsernameClick={onUsernameClicked}
          settings={settings}
          isHighlighted={false}
        />
      ))}
      <ConversationModalComment
        comment={comment}
        settings={settings}
        onUsernameClick={onUsernameClicked}
        isHighlighted={true}
      />
    </HorizontalGutter>
  );
};

// TODO: (cvle) If this could be autogenerated.
type FragmentVariables = ConversationModalContainerPaginationQueryVariables;

const enhanced = withPaginationContainer<
  RootPaginationProps,
  ConversationModalContainerPaginationQueryVariables,
  FragmentVariables
>(
  {
    settings: graphql`
      fragment ConversationModalContainer_settings on Settings {
        ...ConversationModalCommentContainer_settings
      }
    `,
    comment: graphql`
      fragment ConversationModalContainer_comment on Comment
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 1 }
          cursor: { type: "Cursor" }
        ) {
        id
        ...ConversationModalCommentContainer_comment
        rootParent {
          id
        }
        parents(last: $count, before: $cursor)
          @connection(key: "ConversationModal_parents") {
          edges {
            node {
              id
              ...ConversationModalCommentContainer_comment
            }
          }
        }
        parentCount
      }
    `,
  },
  {
    direction: "backward",
    getConnectionFromProps(props) {
      return props.comment && props.comment.parents;
    },
    getVariables(props, { count, cursor }) {
      return {
        count,
        cursor,
        commentID: props.comment.id,
      };
    },
    query: graphql`
      # Pagination query to be fetched upon calling 'loadMore'.
      # Notice that we re-use our fragment, and the shape of this query matches our fragment spec.
      query ConversationModalContainerPaginationQuery(
        $count: Int!
        $cursor: Cursor
        $commentID: ID!
      ) {
        comment(id: $commentID) {
          ...ConversationModalContainer_comment
            @arguments(count: $count, cursor: $cursor)
        }
      }
    `,
  }
)(ConversationModalContainer);

export default enhanced;
