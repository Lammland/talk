import { Localized } from "@fluent/react/compat";
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { graphql } from "react-relay";
import { Virtuoso } from "react-virtuoso";

import { useLocal } from "coral-framework/lib/relay";
import { AllCommentsTabCommentVirtualLocal } from "coral-stream/__generated__/AllCommentsTabCommentVirtualLocal.graphql";
import { COMMENT_SORT } from "coral-stream/__generated__/AllCommentsTabContainerLocal.graphql";
import { AllCommentsTabContainer_settings } from "coral-stream/__generated__/AllCommentsTabContainer_settings.graphql";
import { AllCommentsTabContainer_story } from "coral-stream/__generated__/AllCommentsTabContainer_story.graphql";
import { AllCommentsTabContainer_viewer } from "coral-stream/__generated__/AllCommentsTabContainer_viewer.graphql";
import CLASSES from "coral-stream/classes";
import { NUM_INITIAL_COMMENTS } from "coral-stream/constants";
import { Button } from "coral-ui/components/v3";

import AllCommentsTabCommentContainer from "./AllCommentsTabCommentContainer";

interface Props {
  settings: AllCommentsTabContainer_settings;
  viewer: AllCommentsTabContainer_viewer | null;
  story: AllCommentsTabContainer_story;
  loadMoreAndEmit: () => Promise<any>;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentScrollRef: any;
  alternateOldestViewEnabled: boolean;
  commentsOrderBy: COMMENT_SORT;
}

interface Comment {
  node: {
    id: string;
    seen: boolean | null;
    allChildComments: {
      edges: ReadonlyArray<{ node: { id: string; seen: boolean | null } }>;
    };
  };
}

interface UnseenComment {
  nodeID?: string;
  virtuosoIndex?: number;
  isRoot: boolean;
}

const AllCommentsTabCommentVirtual: FunctionComponent<Props> = ({
  story,
  settings,
  viewer,
  loadMoreAndEmit,
  hasMore,
  isLoadingMore,
  currentScrollRef,
  alternateOldestViewEnabled,
  commentsOrderBy,
}) => {
  const [local, setLocal] = useLocal<AllCommentsTabCommentVirtualLocal>(graphql`
    fragment AllCommentsTabCommentVirtualLocal on Local {
      commentWithTraversalFocus
      firstNextUnseenComment {
        nodeID
        virtuosoIndex
        isRoot
      }
      secondNextUnseenComment {
        nodeID
        virtuosoIndex
        isRoot
      }
      showLoadAllCommentsButton
      oldestFirstNewCommentsToShow
    }
  `);

  const comments = useMemo(() => {
    if (alternateOldestViewEnabled) {
      if (local.oldestFirstNewCommentsToShow) {
        const newCommentsToShowIds = local.oldestFirstNewCommentsToShow.split(
          " "
        );
        return story.comments.edges.filter(
          (c) => !newCommentsToShowIds.includes(c.node.id)
        );
      }
    }
    return story.comments.edges;
  }, [
    story.comments.edges,
    alternateOldestViewEnabled,
    local.oldestFirstNewCommentsToShow,
  ]);

  const newCommentsToShow = useMemo(() => {
    const newCommentsToShowIds = local.oldestFirstNewCommentsToShow?.split(" ");
    return story.comments.edges.filter((c) =>
      newCommentsToShowIds?.includes(c.node.id)
    );
  }, [local.oldestFirstNewCommentsToShow, story.comments.edges]);

  useEffect(() => {
    // on rerender, clear the newly added comments to show if it's
    // alternate oldest view
    setLocal({ oldestFirstNewCommentsToShow: "" });
  }, []);

  const lookForNextUnseen = useCallback(
    (commentsHere: ReadonlyArray<Comment>, nextSlice: Comment[]) => {
      let counter = 0;
      const firstUnseenComment: UnseenComment = { isRoot: true };
      const secondUnseenComment: UnseenComment = { isRoot: true };
      const firstUnseen = nextSlice.find((comment: Comment) => {
        counter += 1;
        if (comment.node.seen === false) {
          return true;
        }
        if (
          comment.node.allChildComments &&
          comment.node.allChildComments.edges.some((c) => {
            if (c.node.seen === false) {
              return true;
            }
            return false;
          })
        ) {
          firstUnseenComment.isRoot = false;
          return true;
        }
        return false;
      });
      const secondUnseen = nextSlice
        .slice(counter + 1)
        .find((comment: Comment) => {
          if (comment.node.seen === false) {
            return true;
          }
          if (
            comment.node.allChildComments &&
            comment.node.allChildComments.edges.some(
              (c) => c.node.seen === false
            )
          ) {
            secondUnseenComment.isRoot = false;
            return true;
          }
          return false;
        });
      if (firstUnseen) {
        firstUnseenComment.virtuosoIndex = commentsHere.findIndex(
          (comment: Comment) => {
            return (
              comment.node.id === firstUnseen?.node.id ||
              (comment.node.allChildComments &&
                comment.node.allChildComments.edges.some(
                  (c) => c.node.id === firstUnseen?.node.id
                ))
            );
          }
        );
        firstUnseenComment.nodeID = firstUnseen.node.id;
      }
      if (secondUnseen) {
        secondUnseenComment.virtuosoIndex = commentsHere.findIndex(
          (comment: Comment) => {
            return (
              comment.node.id === secondUnseen?.node.id ||
              (comment.node.allChildComments &&
                comment.node.allChildComments.edges.some(
                  (c) => c.node.id === secondUnseen?.node.id
                ))
            );
          }
        );
        secondUnseenComment.nodeID = secondUnseen.node.id;
      }
      if (firstUnseen) {
        if (secondUnseen) {
          return [firstUnseenComment, secondUnseenComment];
        }
        return [firstUnseenComment];
      } else {
        return undefined;
      }
    },
    []
  );

  useEffect(() => {
    const indexOfTraversalFocus = comments.findIndex((comment) => {
      return (
        comment.node.id === local.commentWithTraversalFocus ||
        (comment.node.allChildComments &&
          comment.node.allChildComments.edges.some(
            (c) => c.node.id === local.commentWithTraversalFocus
          ))
      );
    });
    const sliceIndex = indexOfTraversalFocus === -1 ? 0 : indexOfTraversalFocus;
    const nextSlice = comments.slice(sliceIndex);
    const nextUnseen = lookForNextUnseen(comments, nextSlice);
    if (nextUnseen && nextUnseen[0]) {
      setLocal({
        firstNextUnseenComment: nextUnseen[0],
      });
      if (nextUnseen[1]) {
        setLocal({
          secondNextUnseenComment: nextUnseen[1],
        });
      }
    } else {
      if (hasMore && !isLoadingMore) {
        void loadMoreAndEmit();
      }
    }
  }, [
    local.commentWithTraversalFocus,
    comments,
    isLoadingMore,
    hasMore,
    loadMoreAndEmit,
    lookForNextUnseen,
    setLocal,
  ]);

  const Footer = useCallback(() => {
    return (
      <>
        {local.showLoadAllCommentsButton &&
          comments.length > NUM_INITIAL_COMMENTS && (
            <Localized id="comments-loadAll">
              <Button
                key={`comments-loadAll-${comments.length}`}
                id="comments-loadAll"
                onClick={() => {
                  setLocal({ showLoadAllCommentsButton: false });
                }}
                color="secondary"
                variant="outlined"
                fullWidth
                disabled={isLoadingMore}
                aria-controls="comments-allComments-log"
                className={CLASSES.allCommentsTabPane.loadMoreButton}
                // Added for keyboard shortcut support.
                data-key-stop
                data-is-load-more
              >
                Load All Comments
              </Button>
            </Localized>
          )}
      </>
    );
  }, [local.showLoadAllCommentsButton, comments, isLoadingMore, setLocal]);

  const ScrollSeekPlaceholder = useCallback(
    ({ height }: { height: number }) => (
      <div
        style={{
          height,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexFlow: "column", height: "100%" }}>
          <div
            style={{
              flex: "0 1 auto",
            }}
          >
            <hr style={{ border: "1px solid #eaeff0" }} />
          </div>
          <div
            style={{
              flex: "0 1 auto",
              backgroundColor: "#f4f7f7",
              width: "50%",
              height: "2rem",
            }}
          ></div>
          <div
            style={{
              flex: "0 1 auto",
              backgroundColor: "white",
              width: "100%",
              height: "1rem",
            }}
          ></div>
          <div
            style={{
              flex: "1 1 auto",
              backgroundColor: "#eaeff0",
              width: "100%",
              height: "95%",
            }}
          ></div>
          <div
            style={{
              flex: "0 1 auto",
              backgroundColor: "white",
              width: "100%",
              height: "1rem",
            }}
          ></div>
          <div
            style={{
              flex: "0 1 1.5rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                backgroundColor: "#f4f7f7",
                height: "100%",
                width: "12rem",
              }}
            ></div>
            <div
              style={{
                backgroundColor: "#f4f7f7",
                height: "100%",
                width: "3rem",
              }}
            ></div>
          </div>
        </div>
      </div>
    ),
    []
  );

  return (
    <>
      <Virtuoso
        {...(process.env.NODE_ENV === "test"
          ? {
              initialItemCount: comments.length,
              key: comments.length,
            }
          : {})}
        useWindowScroll
        ref={currentScrollRef}
        style={{ height: 600 }}
        totalCount={
          local.showLoadAllCommentsButton
            ? comments.length < NUM_INITIAL_COMMENTS
              ? comments.length
              : NUM_INITIAL_COMMENTS
            : comments.length
        }
        overscan={50}
        endReached={() => {
          if (hasMore && !isLoadingMore) {
            void loadMoreAndEmit();
          }
        }}
        itemContent={useCallback(
          (index) => {
            const comment = comments[index];
            return (
              <>
                <AllCommentsTabCommentContainer
                  key={comment.node.id}
                  viewer={viewer}
                  comment={comment.node}
                  story={story}
                  settings={settings}
                  isLast={index === comments.length - 1}
                />
                {/* Show newly posted comments above Load All Comments
                button if alternate oldest view and button is shown */}
                {index === NUM_INITIAL_COMMENTS - 1 &&
                  alternateOldestViewEnabled &&
                  local.showLoadAllCommentsButton &&
                  local.oldestFirstNewCommentsToShow &&
                  newCommentsToShow.map((newComment) => {
                    return (
                      <AllCommentsTabCommentContainer
                        key={newComment.node.id}
                        viewer={viewer}
                        comment={newComment.node}
                        story={story}
                        settings={settings}
                        isLast={false}
                      />
                    );
                  })}
              </>
            );
          },
          [
            story,
            comments,
            settings,
            viewer,
            alternateOldestViewEnabled,
            local.oldestFirstNewCommentsToShow,
            local.showLoadAllCommentsButton,
            newCommentsToShow,
          ]
        )}
        components={{ ScrollSeekPlaceholder, Footer }}
        scrollSeekConfiguration={{
          enter: (velocity) => {
            const shouldEnter = Math.abs(velocity) >= 300;
            return shouldEnter;
          },
          exit: (velocity) => {
            const shouldExit = Math.abs(velocity) === 0;
            return shouldExit;
          },
        }}
      />
    </>
  );
};

export default AllCommentsTabCommentVirtual;
