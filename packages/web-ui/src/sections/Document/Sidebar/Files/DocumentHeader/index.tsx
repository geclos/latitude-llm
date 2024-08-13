import { useCallback, useMemo } from 'react'

import { Icons } from '$ui/ds/atoms'
import { MenuOption } from '$ui/ds/atoms/DropdownMenu'
import { cn } from '$ui/lib/utils'
import { useFileTreeContext } from '$ui/sections/Document/Sidebar/Files/FilesProvider'
import NodeHeaderWrapper, {
  ICON_CLASS,
  IndentType,
} from '$ui/sections/Document/Sidebar/Files/NodeHeaderWrapper'
import { useTempNodes } from '$ui/sections/Document/Sidebar/Files/useTempNodes'

import { Node } from '../useTree'

export function DocumentIcon(
  { selected }: { selected?: boolean } = { selected: false },
) {
  return (
    <Icons.file
      className={cn(ICON_CLASS, {
        'text-accent-foreground': selected,
      })}
    />
  )
}

export default function DocumentHeader({
  open,
  selected,
  node,
  indentation,
}: {
  open: boolean
  selected: boolean
  node: Node
  indentation: IndentType[]
}) {
  const {
    isMerged,
    onMergeCommitClick,
    onNavigateToDocument,
    onDeleteFile,
    onCreateFile,
  } = useFileTreeContext()
  const { deleteTmpFolder, reset } = useTempNodes((state) => ({
    reset: state.reset,
    deleteTmpFolder: state.deleteTmpFolder,
  }))
  const onSaveValue = useCallback(
    async ({ path }: { path: string }) => {
      const parentPath = node.path.split('/').slice(0, -1).join('/')
      await onCreateFile(`${parentPath}/${path}`)
      reset()
    },
    [reset, onCreateFile, node.path],
  )
  const handleClick = useCallback(() => {
    if (selected) return
    if (!node.isPersisted) return

    onNavigateToDocument(node.doc!.documentUuid)
  }, [node.doc!.documentUuid, selected, node.isPersisted, onNavigateToDocument])
  const actions = useMemo<MenuOption[]>(
    () => [
      {
        label: 'Delete file',
        type: 'destructive',
        disabled: isMerged,
        iconProps: { name: 'trash' },
        onClick: () => {
          if (isMerged) {
            onMergeCommitClick()
          } else {
            onDeleteFile({ node, documentUuid: node.doc!.documentUuid })
          }
        },
      },
    ],
    [node.doc!.documentUuid, onDeleteFile, isMerged, onMergeCommitClick],
  )
  return (
    <NodeHeaderWrapper
      isFile
      open={open}
      name={node.name}
      hasChildren={false}
      actions={actions}
      selected={selected}
      indentation={indentation}
      onClick={handleClick}
      onSaveValue={onSaveValue}
      onLeaveWithoutSave={() => deleteTmpFolder({ id: node.id })}
      icons={<DocumentIcon selected={selected} />}
    />
  )
}
