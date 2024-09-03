use hdk::prelude::*;

pub fn create_link_relaxed<T, E>(
    base_address: impl Into<AnyLinkableHash>,
    target_address: impl Into<AnyLinkableHash>,
    link_type: T,
    tag: impl Into<LinkTag>
)  -> ExternResult<ActionHash>
where 
ScopedLinkType: TryFrom<T, Error = E>,
    WasmError: From<E>,
{
    let ScopedLinkType {
        zome_index,
        zome_type: link_type,
    } = link_type.try_into()?;
    HDK.with(|h| {
        h.borrow().create_link(CreateLinkInput::new(
            base_address.into(),
            target_address.into(),
            zome_index,
            link_type,
            tag.into(),
            ChainTopOrdering::Relaxed,
        ))
    })
}

// pub fn create_entry_relaxed<I, E, E2>(input: I) -> ExternResult<ActionHash>
// where
//     ScopedEntryDefIndex: for<'a> TryFrom<&'a I, Error = E2>,
//     EntryVisibility: for<'a> From<&'a I>,
//     Entry: TryFrom<I, Error = E>,
//     WasmError: From<E> + From<E2>,
// {
//     let ScopedEntryDefIndex {
//         zome_index,
//         zome_type: entry_def_index,
//     } = (&input).try_into()?;
//     let i = CreateInput {
//         entry_location: EntryDefLocation::app(zome_index, entry_def_index),
//         entry_visibility:EntryVisibility::Public,
//         entry: input.try_into()?,
//         chain_top_ordering:ChainTopOrdering::Relaxed,
//     };
//     HDK.with(|h| {
//         h.borrow().create(i
//         )
//     })
// }

pub fn create_entryrelaxed<T, E>(
    base_address: impl Into<AnyLinkableHash>,
    target_address: impl Into<AnyLinkableHash>,
    link_type: T,
    tag: impl Into<LinkTag>
)  -> ExternResult<ActionHash>
where 
ScopedLinkType: TryFrom<T, Error = E>,
    WasmError: From<E>,
{
    let ScopedLinkType {
        zome_index,
        zome_type: link_type,
    } = link_type.try_into()?;
    HDK.with(|h| {
        h.borrow().create_link(CreateLinkInput::new(
            base_address.into(),
            target_address.into(),
            zome_index,
            link_type,
            tag.into(),
            ChainTopOrdering::Relaxed,
        ))
    })
}