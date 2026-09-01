import { useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";
import type { FolderDoc, FolderId } from "../types";
import { getDescendantFolderIds, sortFolders } from "../utils/text";

const ROOT_VALUE = "__root__";

interface FolderPickerProps {
  folders: FolderDoc[];
  value: FolderId;
  onChange: (folderId: FolderId) => void;
  label?: string;
  excludeFolderId?: string;
  allowCreate?: boolean;
  onCreateFolder?: (name: string, parentId: FolderId) => Promise<string>;
}

interface FolderOption {
  id: FolderId;
  label: string;
}

function buildOptions(folders: FolderDoc[], excludeFolderId?: string): FolderOption[] {
  const excluded = new Set<string>();

  if (excludeFolderId) {
    excluded.add(excludeFolderId);
    for (const id of getDescendantFolderIds(excludeFolderId, folders)) {
      excluded.add(id);
    }
  }

  const options: FolderOption[] = [{ id: null, label: "Início" }];
  const visit = (parentId: FolderId, depth: number) => {
    const children = sortFolders(
      folders.filter((folder) => folder.parentId === parentId && !excluded.has(folder.id)),
    );

    for (const folder of children) {
      options.push({
        id: folder.id,
        label: `${"  ".repeat(depth)}${folder.name}`,
      });
      visit(folder.id, depth + 1);
    }
  };

  visit(null, 0);
  return options;
}

export function FolderPicker({
  folders,
  value,
  onChange,
  label = "Pasta",
  excludeFolderId,
  allowCreate = false,
  onCreateFolder,
}: FolderPickerProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const options = useMemo(() => buildOptions(folders, excludeFolderId), [excludeFolderId, folders]);
  const selectValue = value ?? ROOT_VALUE;

  const handleCreate = async () => {
    const name = newFolderName.trim();

    if (!name || !onCreateFolder) {
      return;
    }

    setCreating(true);

    try {
      const createdId = await onCreateFolder(name, value);
      onChange(createdId);
      setNewFolderName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="folder-picker">
      <label>
        <span>{label}</span>
        <select
          value={selectValue}
          onChange={(event) => onChange(event.target.value === ROOT_VALUE ? null : event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id ?? ROOT_VALUE} value={option.id ?? ROOT_VALUE}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {allowCreate && onCreateFolder ? (
        <div className="inline-create">
          <label className="sr-only" htmlFor="nova-pasta-picker">
            Nova pasta
          </label>
          <input
            id="nova-pasta-picker"
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="Nova pasta aqui"
            type="text"
            value={newFolderName}
          />
          <button
            className="secondary-button"
            disabled={creating || newFolderName.trim().length === 0}
            onClick={handleCreate}
            type="button"
          >
            <FolderPlus aria-hidden="true" size={18} />
            Criar
          </button>
        </div>
      ) : null}
    </div>
  );
}
